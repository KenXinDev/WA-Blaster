import { prisma } from '@/lib/database/db';

export interface AppConfigData {
  delayMin: number;
  delayMax: number;
  maxRetries: number;
  logLevel: string;
}

export class ConfigService {
  static async getConfig(userId: string): Promise<AppConfigData> {
    let config = await prisma.appConfig.findUnique({
      where: { userId }
    });

    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          userId,
          delayMin: 20000,
          delayMax: 40000,
          maxRetries: 3,
          logLevel: 'info',
        }
      });
    }

    return {
      delayMin: config.delayMin,
      delayMax: config.delayMax,
      maxRetries: config.maxRetries,
      logLevel: config.logLevel,
    };
  }

  static async updateConfig(userId: string, data: Partial<AppConfigData>): Promise<AppConfigData> {
    const config = await prisma.appConfig.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        delayMin: data.delayMin ?? 20000,
        delayMax: data.delayMax ?? 40000,
        maxRetries: data.maxRetries ?? 3,
        logLevel: data.logLevel ?? 'info',
      }
    });

    return {
      delayMin: config.delayMin,
      delayMax: config.delayMax,
      maxRetries: config.maxRetries,
      logLevel: config.logLevel,
    };
  }
}
