import { prisma } from "../db/client.js";
import type { ChatMessage, Prisma } from "../generated/prisma/client.js";
import { requireProject } from "./repo.js";

/**
 * Chat history.
 *
 * Kept in its own table rather than inside the project document: it grows
 * unbounded and changes on a different cadence than the page, so storing it
 * with the page would mean rewriting the whole document on every chat turn.
 */

export type NewMessage = {
  role: string;
  content: string;
  payload?: unknown;
  versionId?: string | null;
};

/**
 * Appends messages, assigning sequence numbers server-side.
 *
 * `seq` is allocated from the current maximum inside a transaction rather than
 * trusted from the client, and ordering never depends on timestamps — two
 * messages written in the same millisecond must still have a definite order.
 */
export async function appendMessages(
  userId: string,
  projectId: string,
  messages: NewMessage[],
): Promise<ChatMessage[]> {
  await requireProject(userId, projectId);
  if (messages.length === 0) return [];

  return prisma.$transaction(async (tx) => {
    const last = await tx.chatMessage.findFirst({
      where: { projectId },
      select: { seq: true },
      orderBy: { seq: "desc" },
    });

    let seq = last?.seq ?? 0;
    const created: ChatMessage[] = [];

    for (const message of messages) {
      seq += 1;
      created.push(
        await tx.chatMessage.create({
          data: {
            projectId,
            seq,
            role: message.role,
            content: message.content,
            payload: (message.payload ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            versionId: message.versionId ?? null,
          },
        }),
      );
    }

    return created;
  });
}

/**
 * Replaces a project's entire chat history.
 *
 * Used by the import path, where the client holds the authoritative thread and
 * partial appends would interleave with whatever is already stored.
 */
export async function replaceMessages(
  tx: Prisma.TransactionClient,
  projectId: string,
  messages: NewMessage[],
): Promise<number> {
  await tx.chatMessage.deleteMany({ where: { projectId } });
  if (messages.length === 0) return 0;

  const result = await tx.chatMessage.createMany({
    data: messages.map((message, index) => ({
      projectId,
      seq: index + 1,
      role: message.role,
      content: message.content,
      payload: (message.payload ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    })),
  });

  return result.count;
}

/**
 * Loads chat history oldest-first, paginated backwards from `before`.
 *
 * Paginated from day one: rendering the last twenty turns must not load four
 * hundred rows.
 */
export async function listMessages(
  userId: string,
  projectId: string,
  limit = 100,
  before?: number,
): Promise<ChatMessage[]> {
  await requireProject(userId, projectId);

  const rows = await prisma.chatMessage.findMany({
    where: {
      projectId,
      ...(before !== undefined ? { seq: { lt: before } } : {}),
    },
    orderBy: { seq: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
  });

  return rows.reverse();
}
