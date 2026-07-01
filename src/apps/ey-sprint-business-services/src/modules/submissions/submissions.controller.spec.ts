import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;

  const serviceMock = {
    getHealth: jest.fn(() => ({ ok: true })),
    listSubmissions: jest.fn(),
    getSubmission: jest.fn(),
    upsertSubmission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [{ provide: SubmissionsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
  });

  it('returns health payload', () => {
    expect(controller.getHealth()).toEqual({ ok: true });
    expect(serviceMock.getHealth).toHaveBeenCalledTimes(1);
  });
});

