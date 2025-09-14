import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const authContext = createContext();
const ContextProvider = ({ children }) => {
  const [user, setUser] = useState();
  let BACKAPI;
  if (import.meta.env.MODE === "development") {
    BACKAPI = import.meta.env.VITE_DEVELOPMENT_API;
  } else {
    BACKAPI = import.meta.env.VITE_PRODUCTION_API;
  }
  const login = (user) => {
    setUser(user);
  };
  const handleLogout = (fetchProperties) => {
    localStorage.setItem("token", "");
    setUser(null);
    fetchProperties();
  };
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKAPI}/api/auth/verify`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.data.success) {
          if (res.data.user) {
            setUser(res.data.user.name);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log(err);
      }
    };
    verifyUser();
  }, []);
  return (
    <authContext.Provider value={{ user, login, handleLogout }}>
      {children}
    </authContext.Provider>
  );
};

export const useAuth = () => useContext(authContext);
export default ContextProvider;
