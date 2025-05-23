import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import "./LoginBox.scss";

import { LogoFacebook, LogoGoogle } from "../../../../assets/icons";

import { removeFromLocal, getFromLocal, updateLocal } from "../../../../helpers/localStorage";
import SpinnerOfDoom from "../../../../components/SpinnerOfDoom/SpinnerOfDoom";
import DynamicInput from "../../../../components/DynamicInput/DynamicInput";
import { getInstitutionMetadata } from "../../../../api/getInstitutionMetadata";
import { DictionaryContext } from "../../../../contexts/DictionaryContext";
import { postMetaInstitution } from "../../../../api/postMetaInstitution";
import { UserDataContext } from "../../../../contexts/UserDataContext";
import { postMetaBusiness } from "../../../../api/postMetaBusiness";
import { postUserMetadata } from "../../../../api/postUserMetadata";
import { getUserMetadata } from "../../../../api/getUserMetadata";
import { postGoogleLogin } from "../../../../api/postGoogleLogin";
import { getCompanyMeta } from "../../../../api/getCompanyMeta";
import { getGoogleLogin } from "../../../../api/getGoogleLogin";
import { postLogin } from "../../../../api/postLogin";
import { getUser } from "../../../../api/getUser";
import { putUser } from "../../../../api/putUser";

const LoginBox = ({ institutions }) => {
  const { dictionary, language } = useContext(DictionaryContext);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const boxContainer = useRef(null);

  // ------------------------- Login Flow ------------------------------

  const { userData, updateUserData } = useContext(UserDataContext);

  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(true);
  const [isDisabledPost, setIsDisabledPost] = useState(true);
  const [screen, setScreen] = useState(0);
  const [userID, setUserID] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  // Login data
  const [inputs, setInputs] = useState({
    email: "",
    password: "",
  });

  const pureAuth = (data) => {
    updateLocal("tempUser", data.jwt);

    (async () => {
      //Get role
      const { ok, data: roleRes } = await getUser(true);

      if (ok) {
        const { role } = roleRes;

        // Check Meta
        (async (role) => {
          let res;

          // Company
          if (role.id === 4) {
            res = await getCompanyMeta(true);
          }
          // Institution
          else if (role.id === 6) {
            res = await getInstitutionMetadata(true);
          }
          // Student or Instructor
          else {
            res = await getUserMetadata(true);
          }

          const { ok } = res;

          // Successful login
          if (ok) {
            toast.success(dictionary.login.access[language]);
            updateLocal("loggedUser", data.jwt);
            updateUserData({ jwt: data.jwt });
          }
          // Post Registration
          else {
            toast.success(dictionary.login.done[language]);

            setUserInfo(roleRes);
            setUserID(data.user.id);

            // Company
            if (role.id === 4) {
              setScreen(2);
            }
            // Institution
            else if (role.id === 6) {
              setScreen(3);
            }
            // Student or Instructor
            else {
              setScreen(1);
            }

            setIsLoading(false);
          }
        })(role);
      } else {
        toast.error(`${roleRes.error.message}`);
      }
    })();
  };

  useEffect(() => {
    // Trigger message on confirmation
    if (searchParams.get("confirmed")) {
      toast.success(dictionary.login.confirmed[language]);
    }

    //Login with Google
    let code = searchParams.get("code");

    if (code) {
      const obj = {
        code,
      };

      const getJWT = async () => {
        const { ok, data } = await postGoogleLogin(obj);

        if (ok) {
          let { token, user } = data.data;

          pureAuth({ jwt: token, user });
          //
        } else {
          toast.error(`${data.error.message}`);
          setIsLoading(false);
        }
      };

      getJWT();
    }
  }, []); //eslint-disable-line

  const getGoogleWindow = async () => {
    setIsLoading(true);

    const { ok, data } = await getGoogleLogin();

    if (ok) {
      window.open(data.url, "_self");
    } else {
      toast.error(`${data.error.message}`);
    }

    setIsLoading(false);
  };

  const runAuth = async () => {
    // Clear bad localStorage
    if (getFromLocal("loggedUser")) {
      removeFromLocal("loggedUser");
    }

    const { ok, data } = await postLogin({
      identifier: inputs.email,
      password: inputs.password,
    });

    // console.log(data);

    if (ok) {
      pureAuth(data);
    } else {
      toast.error(`${data.error.message}`);
      setIsLoading(false);
    }
  };

  // Post login
  useEffect(() => {
    if (userData.info) {
      if (userData.instructor) {
        navigate("/role");
      } else {
        navigate("/");
      }
    }
  }, [userData]); //eslint-disable-line

  const runPostRegister = async () => {
    // Company
    if (screen === 2) {
      const newSlug = {
        slug: `${userInfo.nombre.toLowerCase().trim().replace(/\s/g, "")}-${Date.now()}`,
      };

      const { ok: PUTState, data: PUTData } = await putUser(userID, newSlug, true);

      if (PUTState) {
        const objMetadata = {
          data: {
            user: userID,
            notificacion_promocion: true,
            notificacion_mensajes: true,
            notificacion_anuncios_instructores: true,
            numberOfWorkers: inputsPRBusiness.numberOfWorkers,
            description: inputsPRBusiness.description,
            foundationDate: inputsPRBusiness.foundationDate,
            address: inputsPRBusiness.address,
          },
        };

        const { ok, data } = await postMetaBusiness(objMetadata);

        console.log(data);

        if (ok) {
          toast.success(dictionary.login.post[language]);

          setTimeout(() => {
            runAuth();
          }, 3e3);
        } else {
          toast.error(`${data.error.message}`);
          setIsLoading(false);
        }
      } else {
        toast.error(`${PUTData.error.message}`);
        setIsLoading(false);
      }
    }
    // Institution
    else if (screen === 3) {
      const newSlug = {
        slug: `${userInfo.nombre.toLowerCase().trim().replace(/\s/g, "")}-${Date.now()}`,
      };

      const { ok: PUTState, data: PUTData } = await putUser(userID, newSlug, true);

      if (PUTState) {
        const objMetadata = {
          data: {
            description: inputsPRInstitutions.description,
            foundationDate: inputsPRInstitutions.foundationDate,
            address: inputsPRInstitutions.address,
          },
        };

        const { ok, data } = await postMetaInstitution(objMetadata);

        console.log(data);

        if (ok) {
          toast.success(dictionary.login.post[language]);

          setTimeout(() => {
            runAuth();
          }, 300);
        } else {
          toast.error(`${data.error.message}`);
          setIsLoading(false);
        }
      } else {
        toast.error(`${PUTData.error.message}`);
        setIsLoading(false);
      }
    }
    // Student or Instructor
    else {
      const objMetadata = {
        data: {
          notificacion_promocion: true,
          notificacion_mensajes: true,
          notificacion_anuncios_instructores: true,
          profesion: inputsPRUser.occupation,
          biografia: "",
          birthday: inputsPRUser.birthdate,
          address: inputsPRUser.location,
        },
      };

      const { ok, data } = await postUserMetadata(objMetadata);

      console.log(data);

      if (ok) {
        const objUser = {
          nombre: inputsPRUser.firstName,
          apellidos: inputsPRUser.lastName,
        };

        const { ok, data } = await putUser(userID, objUser, true);

        console.log(data);

        if (ok) {
          toast.success(dictionary.login.post[language]);

          setTimeout(() => {
            runAuth();
          }, 300);
        } else {
          toast.error(`${data.error.message}`);
          setIsLoading(false);
        }
      } else {
        toast.error(`${data.error.message}`);
        setIsLoading(false);
      }
    }
  };

  const handleClick = (e) => {
    e.preventDefault();

    setIsLoading(true);

    runAuth();
  };

  const handleClickPost = (e) => {
    e.preventDefault();

    setIsLoading(true);

    runPostRegister();
  };

  // Handle login disable state
  useEffect(() => {
    if (!inputs.email || !inputs.password) {
      setIsDisabled(true);
    } else {
      setIsDisabled(false);
    }
  }, [inputs]);

  const [inputsPRUser, setInputsPRUser] = useState({
    firstName: "",
    lastName: "",
    birthdate: "",
    occupation: "",
    location: "",
  });

  const [inputsPRBusiness, setInputsPRBusiness] = useState({
    notificacion_promocion: true,
    notificacion_mensajes: true,
    notificacion_anuncios_instructores: true,
    numberOfWorkers: "",
    description: "",
    foundationDate: "",
    address: "",
  });

  const [inputsPRInstitutions, setInputsPRInstitutions] = useState({
    description: "",
    foundationDate: "",
    address: "",
  });

  // Handle post-register button disabled state
  useEffect(() => {
    if (
      !inputsPRUser.firstName ||
      inputsPRUser.firstName.length < 2 ||
      inputsPRUser.lastName.length < 3 ||
      !inputsPRUser.lastName ||
      !inputsPRUser.birthdate ||
      !inputsPRUser.location ||
      !inputsPRUser.occupation
    ) {
      setIsDisabledPost(true);
    } else {
      setIsDisabledPost(false);
    }
  }, [inputsPRUser]);

  return (
    <div id="login-box" className="auth-box" ref={boxContainer}>
      {screen === 0 ? (
        <>
          {/* Normal login */}
          <h1>{dictionary.login.box[0][language]}</h1>
          <p className="below">{dictionary.login.box[1][language]}</p>

          <form>
            <DynamicInput id={"email"} type={"email"} state={[inputs, setInputs]} />
            <DynamicInput id={"password"} type={"password"} state={[inputs, setInputs]} />
            <Link className="recover-password" to="/auth/account-recovery">
              {dictionary.login.box[2][language]}
            </Link>

            <button className="action-button" onClick={handleClick} disabled={isLoading || isDisabled}>
              {isLoading && <SpinnerOfDoom />}
              {dictionary.login.box[3][language]}
            </button>
          </form>

          <p className="first-time">
            {dictionary.login.box[4][language]}{" "}
            <Link to={institutions ? "/ins-auth/signup" : "/auth/signup"}>{dictionary.login.box[5][language]}</Link>
          </p>

          <div className="separator">
            <span>{dictionary.login.box[6][language]}</span>
          </div>

          <button className="continue-with-google" onClick={getGoogleWindow}>
            <LogoGoogle />
            <p>{dictionary.login.google[language]}</p>
          </button>

          <button className="continue-with-facebook">
            <LogoFacebook />
            <p>{dictionary.login.box[7][language]}</p>
          </button>
        </>
      ) : screen === 1 ? (
        <>
          {/* Post register for users */}
          <h2>{dictionary.login.box[9][language]}</h2>
          <p className="below">{dictionary.login.box[10][language]}</p>

          <form autoComplete="off">
            <DynamicInput
              id={"firstName"}
              state={[inputsPRUser, setInputsPRUser]}
              noIcon
              placeholder={dictionary.login.box[11][language]}
              label={dictionary.login.box[11][language]}
            />
            <DynamicInput
              id={"lastName"}
              state={[inputsPRUser, setInputsPRUser]}
              noIcon
              placeholder={dictionary.login.box[12][language]}
              label={dictionary.login.box[12][language]}
            />
            <DynamicInput
              id={"birthdate"}
              type="date"
              state={[inputsPRUser, setInputsPRUser]}
              noIcon
              label={dictionary.login.box[13][language]}
            />
            <DynamicInput
              id={"occupation"}
              state={[inputsPRUser, setInputsPRUser]}
              noIcon
              placeholder={dictionary.login.box[14][language]}
              label={dictionary.login.box[14][language]}
            />
            <DynamicInput
              id={"location"}
              state={[inputsPRUser, setInputsPRUser]}
              noIcon
              placeholder={dictionary.login.box[15][language]}
              label={dictionary.login.box[15][language]}
            />

            <button className="action-button" onClick={handleClickPost} disabled={isLoading || isDisabledPost}>
              {isLoading && <SpinnerOfDoom />}
              {dictionary.login.box[16][language]}
            </button>
          </form>
        </>
      ) : screen === 2 ? (
        <>
          {/* Post register for business */}
          <h2>{dictionary.login.box[9][language]}</h2>
          <p className="below">{dictionary.login.box[10][language]}</p>
          <form autoComplete="off">
            <DynamicInput
              id={"description"}
              state={[inputsPRBusiness, setInputsPRBusiness]}
              noIcon
              placeholder={dictionary.login.box[17][language]}
              label={dictionary.login.box[17][language]}
            />
            <DynamicInput
              id={"numberOfWorkers"}
              state={[inputsPRBusiness, setInputsPRBusiness]}
              type="number"
              number
              noIcon
              placeholder={dictionary.login.box[18][language]}
              label={dictionary.login.box[18][language]}
            />
            <DynamicInput
              id={"foundationDate"}
              state={[inputsPRBusiness, setInputsPRBusiness]}
              type="date"
              noIcon
              label={dictionary.login.box[19][language]}
            />
            <DynamicInput
              id={"address"}
              state={[inputsPRBusiness, setInputsPRBusiness]}
              noIcon
              placeholder={dictionary.login.box[20][language]}
              label={dictionary.login.box[20][language]}
            />

            <button
              className="action-button"
              onClick={handleClickPost}
              disabled={
                isLoading ||
                !inputsPRBusiness.address ||
                !inputsPRBusiness.description ||
                !inputsPRBusiness.foundationDate ||
                !inputsPRBusiness.numberOfWorkers
              }
            >
              {isLoading && <SpinnerOfDoom />}
              {dictionary.login.box[16][language]}
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Post register for institutions */}
          <h2>{dictionary.login.box[9][language]}</h2>
          <p className="below">{dictionary.login.box[10][language]}</p>

          <form autoComplete="off">
            <DynamicInput
              id={"description"}
              state={[inputsPRInstitutions, setInputsPRInstitutions]}
              noIcon
              placeholder={dictionary.login.box[21][language]}
              label={dictionary.login.box[21][language]}
            />
            <DynamicInput
              id={"foundationDate"}
              state={[inputsPRInstitutions, setInputsPRInstitutions]}
              type="date"
              noIcon
              label={dictionary.login.box[22][language]}
            />
            <DynamicInput
              id={"address"}
              state={[inputsPRInstitutions, setInputsPRInstitutions]}
              noIcon
              placeholder={dictionary.login.box[23][language]}
              label={dictionary.login.box[23][language]}
            />

            <button
              className="action-button"
              onClick={handleClickPost}
              disabled={
                isLoading ||
                !inputsPRInstitutions.description ||
                !inputsPRInstitutions.foundationDate ||
                !inputsPRInstitutions.address
              }
            >
              {isLoading && <SpinnerOfDoom />}
              {dictionary.login.box[16][language]}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default LoginBox;
