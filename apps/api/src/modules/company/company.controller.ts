import type { RequestHandler } from 'express';
import { companyDtoSchema } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createCompanyService } from '@/modules/company/company.service';

type CompanyService = ReturnType<typeof createCompanyService>;

export function createCompanyController(service: CompanyService) {
  return {
    create: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.status(201).json(companyDtoSchema.parse(await service.create(userId, req.body)));
    }) satisfies RequestHandler,

    getMine: (async (_req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(companyDtoSchema.parse(await service.getMine(userId)));
    }) satisfies RequestHandler,

    getPublic: (async (req, res) => {
      res.json(companyDtoSchema.parse(await service.getPublic(req.params.id as string)));
    }) satisfies RequestHandler,
  };
}
