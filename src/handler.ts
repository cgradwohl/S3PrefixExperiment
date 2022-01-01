import { APIGatewayProxyEvent } from "aws-lambda";
import {
  getDay,
  getHours,
  getMinutes,
  getMonth,
  getSeconds,
  getYear,
} from "date-fns";

import * as AWS from "aws-sdk";
import { Agent } from "https";

const agent = new Agent({
  keepAlive: true,
  maxSockets: Infinity,
  rejectUnauthorized: true,
});
// @ts-ignore: this failure is a false positive
agent.setMaxListeners(0);

AWS.config.update({
  httpOptions: {
    agent,
    connectTimeout: 1000,
    timeout: 5 * 1000,
  },
  maxRetries: 3,
});

const s3 = new AWS.S3();

const generateS3Prefix = (tenantId: string) => {
  const now = Date.now();
  return `${getSeconds(now)}/${getMinutes(now)}/${getHours(now)}/${getDay(
    now
  )}/${getMonth(now)}/${getYear(now)}/${tenantId}`;
};

export const generateFilePath = ({ tenantId }) => {
  const prefix = generateS3Prefix(`${tenantId.replace("/", "-")}`);

  return `${prefix}/request.json`;
};

const putJson = async ({ tenantId, json }) => {
  const filePath = generateFilePath({ tenantId });
  // call genrate and return the filePath

  await s3
    .putObject({
      Body: JSON.stringify(json),
      Bucket: process.env.S3_BUCKET,
      ContentType: "application/json",
      Key: filePath,
    })
    .promise();

  return { filePath };
};

const tenantId = "3b9a7fa2-1ed5-50ed-9e73-f892ca05194b";

export default async (event: APIGatewayProxyEvent) => {
  const json = {
    message: {
      template: "TEST",
      to: {
        email: "test@example.com",
      },
      providers: {
        sendgrid: {
          override: {
            body: {
              attachments: [
                {
                  content: "eyJmb28iOiJiYXIifQ==",
                  type: "application/json",
                  filename: "SENDGRID_ATTACH.json",
                },
              ],
            },
          },
        },
      },
    },
  };

  const { filePath } = await putJson({ tenantId, json });

  console.log("tenantId :::", tenantId);
  console.log("filePath :::", filePath);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        event,
        message: "hello creature ...",
      },
      null,
      2
    ),
  };
};
