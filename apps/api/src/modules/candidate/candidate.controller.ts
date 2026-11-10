import type { Request, Response } from 'express';
import type { UpdateCandidateProfileInput } from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { currentAuth } from '@/middlewares/authenticate';
import { CandidateService } from '@/modules/candidate/candidate.service';

export class CandidateController {
  constructor(private readonly candidateService: CandidateService = new CandidateService()) {}

  getProfile = async (_req: Request, res: Response): Promise<void> => {
    const { userId } = currentAuth(res.locals);
    res.json(await this.candidateService.getProfile(userId));
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const { userId } = currentAuth(res.locals);
    const input = req.body as UpdateCandidateProfileInput;
    res.json(await this.candidateService.updateProfile(userId, input));
  };

  uploadCv = async (req: Request, res: Response): Promise<void> => {
    const { userId } = currentAuth(res.locals);
    if (!req.file?.buffer) {
      throw new AppError('VALIDATION_ERROR', 'CV file is required in request field "cv"');
    }
    const result = await this.candidateService.uploadCv(
      userId,
      req.file.buffer,
      req.file.originalname,
    );
    res.status(201).json(result);
  };

  deleteCv = async (_req: Request, res: Response): Promise<void> => {
    const { userId } = currentAuth(res.locals);
    await this.candidateService.deleteCv(userId);
    res.status(204).send();
  };

  downloadCv = async (_req: Request, res: Response): Promise<void> => {
    const { userId } = currentAuth(res.locals);
    const { stream, originalFileName, mimeType } = await this.candidateService.getCvStream(
      userId,
      userId,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalFileName)}"`,
    );
    stream.pipe(res);
  };
}
