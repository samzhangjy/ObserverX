import 'dotenv/config';
import { instanceToPlain } from 'class-transformer';
import type ObserverX from '@observerx/core';
import {
  Action,
  ActionBundle,
  ActionParameters,
  limitTokensFromMessages,
  Message,
  modelMap,
} from '@observerx/core';

export interface SearchChatHistoryParameters extends ActionParameters {
  keyword?: string;
  date?: string;
  time_range?: string;
  page?: number;
}

/**
 * Fill TypeORM generated SQL with parameters.
 * From https://dev.to/avantar/how-to-output-raw-sql-with-filled-parameters-in-typeorm-14l4, edited.
 * @param sql Raw SQL generated by TypeORM.
 * @param params Parameters used in the SQL.
 */
function getQueryWithParams(sql: string, params: any[]) {
  let result = sql;

  params.forEach((value, i) => {
    const index = `$${i + 1}`;
    if (typeof value === 'string') {
      result = result.replace(index, `'${value}'`);
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        result = result.replace(
          '?',
          value
            .map((element) => (typeof element === 'string' ? `"${element}"` : element))
            .join(','),
        );
      } else {
        result = result.replace(index, value);
      }
    }

    if (['number', 'boolean'].includes(typeof value)) {
      result = result.replace(index, value.toString());
    }
  });

  return result;
}

export async function searchChatHistory(
  { keyword, date, time_range, page = 1 }: SearchChatHistoryParameters,
  bot: ObserverX,
) {
  let timeRangeBegin = null;
  let timeRangeEnd = null;
  const perPage = parseInt(process.env.HISTORY_PER_PAGE ?? '10', 10);

  if (time_range) {
    [timeRangeBegin, timeRangeEnd] = time_range
      .trim()
      .split(',')
      .map((t) => t.trim());
  }

  const repository = bot.dataSource.getRepository(Message);

  const searchQuery = repository
    .createQueryBuilder()
    .select('message')
    .from(Message, 'message')
    .where(
      keyword
        ? `to_tsvector('chinese', message.content) @@ to_tsquery('chinese', :keyword)`
        : 'true',
      {
        keyword: `${keyword?.trim()?.replace(/ /g, ' & ')}:*`,
      },
    )
    .andWhere(
      // eslint-disable-next-line no-nested-ternary
      !date && !time_range
        ? 'true'
        : date
        ? `date_trunc('day', message.timestamp) = :date`
        : `message.timestamp BETWEEN :begin AND :end`,
      { date, begin: timeRangeBegin, end: timeRangeEnd },
    )
    .andWhere('message.parentId = :parentId', { parentId: bot.parentId });

  const [sqlWithoutParams, params] = searchQuery.getQueryAndParameters();
  const rawSql = getQueryWithParams(sqlWithoutParams, params);

  const messages = limitTokensFromMessages(
    await searchQuery
      .orderBy('message.timestamp', 'DESC')
      .groupBy('message.id')
      .take(perPage)
      .skip((page - 1) * perPage)
      .getMany(),
    modelMap[bot.model].tokenLimit / 3,
  );

  // TypeORM builtin support for COUNT(DISTINCT ...) is very buggy and includes duplicates,
  // so we have to use raw SQL here
  // TODO: try to workaround it by using QueryBuilder
  const total = parseInt(
    (
      await repository.query(
        rawSql.replace(/(SELECT\s)(.*?)(\sFROM.*?)/, `$1COUNT(DISTINCT "message"."id") AS "cnt"$3`),
      )
    )[0].cnt,
    10,
  );

  return {
    messages: messages.map((message) => instanceToPlain(message)),
    total_messages: total,
    total_pages: Math.ceil(total / perPage),
    current_page: page,
  };
}

export interface GetMessageParameters {
  id: number;
}

export async function getMessage({ id: messageId }: GetMessageParameters, bot: ObserverX) {
  const repository = bot.dataSource.getRepository(Message);
  return repository.findOneBy({ id: messageId });
}

export const searchChatHistoryAction = new Action(
  {
    name: 'search_chat_history',
    description:
      'Searches chat history content with the user based on the keyword. At least one of the ' +
      'parameters are required. You can always fetch for more pages if needed. Newest results come at the top.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description:
            'Keyword to search for. Note that it will ONLY search in the content column.',
        },
        date: {
          type: 'string',
          description:
            'Searches for all messages on the specified day. Uses time format of YYYY-MM-DD.',
        },
        time_range: {
          type: 'string',
          description:
            'Searches for all messages in the specified time range. Uses time format of ' +
            'YYYY-MM-DD HH-MM-SS. Beginning and ending time are separated by a single comma, such as ' +
            'YYYY-MM-DD HH:MM:SS,YYYY-MM-DD HH:MM:SS.',
        },
        page: {
          type: 'number',
          description:
            'Determines current page of search results. There are up to 10 results per page. Page numbers starts at 1.',
        },
      },
      required: [],
    },
  },
  searchChatHistory,
);

export const getMessageAction = new Action(
  {
    name: 'get_message',
    description: 'Fetches a single chat message entry by its ID. Returns null if not found.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'ID of the chat history entry.',
        },
      },
      required: ['id'],
    },
  },
  getMessage,
);

const actions: ActionBundle = [searchChatHistoryAction, getMessageAction];

export default actions;
