import type { Request, Response } from "express";

export const getTranscription = (req: Request, res: Response) => {
  res.send("Hello, World!");
};
