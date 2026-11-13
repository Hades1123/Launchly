import type { RequestHandler } from 'express';
import { adminCompanySchema, type AdminCompanyListQuery } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createAdminCompanyService } from '@/modules/admin/admin-company.service';

type AdminCompanyService = ReturnType<typeof createAdminCompanyService>;

export function createAdminCompanyController(service: AdminCompanyService) {
  return {
    list: (async (req, res) => {
      const { status } = req.query as unknown as AdminCompanyListQuery;
      res.json(adminCompanySchema.array().parse(await service.list(status)));
    }) satisfies RequestHandler,

    get: (async (req, res) => {
      res.json(adminCompanySchema.parse(await service.get(req.params.id as string)));
    }) satisfies RequestHandler,

    approve: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(adminCompanySchema.parse(await service.approve(req.params.id as string, userId)));
    }) satisfies RequestHandler,

    reject: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const company = await service.reject(req.params.id as string, userId, req.body.reason);
      res.json(adminCompanySchema.parse(company));
    }) satisfies RequestHandler,
  };
}
