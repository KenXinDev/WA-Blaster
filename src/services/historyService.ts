import prisma from '@/lib/prisma';

export class HistoryService {
  static async getHistories(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [histories, total] = await Promise.all([
      prisma.messageHistory.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          whatsappAccount: { select: { displayName: true, phoneNumber: true } },
          excelFile: { select: { fileName: true } },
        },
      }),
      prisma.messageHistory.count({ where: { userId } }),
    ]);

    return {
      histories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getHistoryDetails(historyId: string, userId: string) {
    const history = await prisma.messageHistory.findFirst({
      where: { id: historyId, userId },
      include: {
        whatsappAccount: { select: { displayName: true, phoneNumber: true } },
        excelFile: { select: { fileName: true } },
        deliveryResults: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });
    if (!history) throw new Error('History not found');
    return history;
  }

  static async createHistory(data: {
    userId: string;
    whatsappAccountId: string;
    excelFileId: string;
    totalRecipients: number;
    messageContent: string;
    templateId?: string;
  }) {
    return prisma.messageHistory.create({
      data: {
        userId: data.userId,
        whatsappAccountId: data.whatsappAccountId,
        excelFileId: data.excelFileId,
        totalRecipients: data.totalRecipients,
        messageContent: data.messageContent,
        templateId: data.templateId ?? null,
        status: 'SENDING',
        successCount: 0,
        failureCount: 0,
      },
    });
  }

  static async updateHistory(
    historyId: string,
    data: {
      status?: string;
      successCount?: number;
      failureCount?: number;
      completedAt?: Date;
    }
  ) {
    return prisma.messageHistory.update({
      where: { id: historyId },
      data,
    });
  }

  static async addDeliveryResult(data: {
    historyId: string;
    phoneNumber: string;
    status: 'SENT' | 'FAILED';
    errorMessage?: string;
    sentAt?: Date;
  }) {
    return prisma.deliveryResult.create({
      data: {
        historyId: data.historyId,
        phoneNumber: data.phoneNumber,
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        sentAt: data.sentAt ?? (data.status === 'SENT' ? new Date() : null),
      },
    });
  }

  static async getUserStats(userId: string) {
    const [totalCampaigns, aggregate] = await Promise.all([
      prisma.messageHistory.count({ where: { userId } }),
      prisma.messageHistory.aggregate({
        where: { userId },
        _sum: { successCount: true, failureCount: true, totalRecipients: true },
      }),
    ]);

    const totalSent = aggregate._sum.successCount ?? 0;
    const totalFailed = aggregate._sum.failureCount ?? 0;
    const totalRecipients = aggregate._sum.totalRecipients ?? 0;
    const avgSuccessRate =
      totalRecipients > 0
        ? Math.round((totalSent / totalRecipients) * 100)
        : 0;

    return { totalCampaigns, totalSent, totalFailed, avgSuccessRate };
  }
}
