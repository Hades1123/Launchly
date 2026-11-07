import type { Request, Response, NextFunction } from 'express';
import { CandidateService } from './candidate.service';
import { updateCandidateProfileSchema } from '@launchly/shared';
import { AppError } from '@/lib/app-error';

export class CandidateController {
  constructor(private readonly candidateService: CandidateService = new CandidateService()) {}

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.candidateService.getProfile(req.user!.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = updateCandidateProfileSchema.parse(req.body);
      const profile = await this.candidateService.updateProfile(req.user!.id, validated);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  uploadCv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file || !req.file.buffer) {
        throw new AppError('VALIDATION_ERROR', 'CV file is required in request field "cv"');
      }

      const result = await this.candidateService.uploadCv(
        req.user!.id,
        req.file.buffer,
        req.file.originalname,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  deleteCv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.candidateService.deleteCv(req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  downloadCv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetId = (req.params.candidateId as string) || req.user!.id;
      const { stream, originalFileName, mimeType } = await this.candidateService.getCvStream(
        req.user!.id,
        targetId,
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(originalFileName)}"`,
      );
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };
}
