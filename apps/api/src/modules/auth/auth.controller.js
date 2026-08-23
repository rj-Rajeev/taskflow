import { loginUser, logoutUser, registerUser, renewSession } from "./auth.service.js";

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await registerUser(name, email, password);

    return res.status(201).json({
      success: true,
      message: "User Successfully Registerd",
      user,
    });
  } catch (error) {
    if (error.code === "USER_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    console.error("Register error:", error);

    return res
      .status(500)
      .json({ success: false, message: error.message, error: error });
  }
}

export async function login(req, res) {
  try {
    const {email, password} = req.body;

    if(!email || !password){
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await loginUser(email, password);
    return res.status(200).json({
      success: true,
      message: "User Successfully LoggedIn",
      ...user,
    });
  } catch (error) {

    if (error.code === "USER_NOT_EXISTS" || error.code === "INCORRECT_PASSWORD") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.error(error);
    
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    })
  }
}

export async function refresh(req, res) {
  try {
    const {refreshToken} = req.body;
    if(!refreshToken){
      return res.status(400).json({
        success: false,
        message: "refreshToken required"
      })
    }

    const data = await renewSession(refreshToken);
    return res.status(200).json({
      success: true,
      ...data
    })
  } catch (error) {
    if(error.code === "INVALID_REFRESH_TOKEN"){
      return res.status(401).json({
        success: false,
        message: "Invalid Refresh Token"
      })
    }
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    })
  }
}

export async function logout(req, res) {
  try {
    const {refreshToken} = req.body;
    if(!refreshToken){
      return res.status(400).json({
        success: false,
        message: "refreshToken required"
      })
    }

   await logoutUser(refreshToken);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    })
  } catch (error) {
    if(error.code === "INVALID_REFRESH_TOKEN"){
      return res.status(401).json({
        success: false,
        message: "Invalid Refresh Token"
      })
    }
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    })
  }
}
