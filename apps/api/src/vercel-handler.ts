import 'reflect-metadata';
import { setDefaultResultOrder } from 'node:dns';
import { NestFactory } from '@nestjs/core';
import type { Application, Request, Response } from 'express';
import { loadConfig } from '@sap/config';
import { AppModule } from './app.module.js';
import { bootstrapHttpApp } from './platform/http/bootstrap-http-app.js';

setDefaultResultOrder('ipv4first');

let handlerPromise: Promise<Application> | undefined;

async function createHandler(): Promise<Application> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  bootstrapHttpApp(app, config);
  await app.init();
  return app.getHttpAdapter().getInstance() as Application;
}

export async function handleVercelRequest(request: Request, response: Response): Promise<void> {
  if (!handlerPromise) {
    handlerPromise = createHandler().catch((error: unknown) => {
      handlerPromise = undefined;
      throw error;
    });
  }

  const handler = await handlerPromise;
  handler(request, response);
}
