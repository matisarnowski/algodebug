import passport from "passport";
import { Provider } from "./structures/Provider";
import { NextFunction, Request, Response } from "express";
import { validateUser } from "./service";

const checkProvider = (provider: string) => {
    try {
        Provider.check(provider);
        return true;
    } catch (e) {
        return false;
    }
};

export const authUser = (req: Request, res: Response, next: NextFunction) => {
    console.log("authUser: " + req.headers.host);
    const provider = req.params.provider;
    if (!checkProvider(provider)) {
        res.status(400).json({ error: "Invalid provider" });
    } else {
        passport.authenticate("google", { scope: ["email", "profile"] })(req, res, next);
    }
};

export const authCallback = (req: Request, res: Response, next: NextFunction) => {
    const provider = req.params.provider;
    console.log("authUserCallback: " + req.headers.host);
    if (!checkProvider(provider)) {
        res.status(400).json({ error: "Invalid provider" });
    } else {
        passport.authenticate("google", {
            successRedirect: "/auth/success",
            failureRedirect: "/error",
            failureMessage: true,
        })(req, res, next);
    }
};

export const authSuccess = (req: Request, res: Response) => {
    // will send message to window opener (main AlgoDebug window)
    // with user data and script to close auth window
    res.setHeader("Content-Type", "text/html");
    const user = JSON.stringify(req.user);
    console.log(req.get("origin"))
    const script =
        "<script>" +
        "window.onload = () => {" +
        "if (!window.opener) return;" +
        `window.opener.postMessage(${user}, \"http://localhost:8081\");` +
        "window.close()" +
        "}" +
        "</script>";

    res.send(script);
};

export const authLogout = (req: Request, res: Response) => {
    req.logout(() => {
        res.status(200).json({ loggedIn: false });
    });
};

export const authVerify = (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
        res.status(200).json({ loggedIn: true, user: req.user });
    } else {
        res.status(200).json({ loggedIn: false });
    }
};
