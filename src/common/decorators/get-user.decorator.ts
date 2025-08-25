import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { id: string; email: string };
    return data ? user?.[data] : user;
  },
);

export const GetCaseShare = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const caseShare = request.caseShare as { clientId: string; caseId: string };
    return data ? caseShare?.[data] : caseShare;
  },
);

export const GetResetToken = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const payload = request.resetPayload;
    return data ? payload?.[data] : payload;
  },
);
