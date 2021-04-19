'use strict';

import { JSDOM } from 'jsdom';
const chromium = require('chrome-aws-lambda');

import * as AWS from 'aws-sdk';

const region = process.env.AWS_REGION;
if (!region) {
    throw new Error(`Missing env var 'AWS_REGION'`);
}
const sqsQueueUrl = process.env.SQS_QUEUE_URL;
if (!sqsQueueUrl) {
    throw new Error(`Missing env var 'SQS_QUEUE_URL'`);
}
AWS.config.update({ region });

const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const agent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36';

module.exports.process = async (event) => {
    console.log('Event', JSON.stringify(event, null, 2));
    const url = ``;

    let browser = null;

    try {
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        let page = await browser.newPage();
        await page.setUserAgent(agent);
        console.log('Navigating to page: ', url);
        await page.goto(url);
        const html = await page.content();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const matches = document.querySelectorAll(
            'input[data-item-available][name="ean[desktop][]"][data-size="4"]'
        );
        console.log(`Found count=${matches?.length} matches`);
        const el = matches[0];
        console.log('el', JSON.stringify(el));
        const dataset = JSON.stringify(el.dataset);
        console.log('el dataset', dataset);
        const isAvailable = el.dataset.itemAvailable === 1;
        console.log('Is item available?', isAvailable);

        if (isAvailable) {
            const params = {
                DelaySeconds: 0,
                MessageAttributes: {
                    URL: {
                        DataType: 'String',
                        StringValue: url,
                    },
                },
                MessageBody: JSON.stringify({
                    url,
                    payload: { dataset },
                    isAvailable,
                    timestamp: new Date().toISOString(),
                }),
                QueueUrl: sqsQueueUrl,
            };

            try {
                const sqsResponse = await sqs.sendMessage(params).promise();
                console.log(
                    `Successfully sent SQS message with messageId=`,
                    sqsResponse.MessageId,
                    sqsResponse
                );
            } catch (e) {
                console.error(
                    `Error sending message to SQS queue=${sqsQueueUrl}`,
                    e
                );
            }
        }

        await page.close();
        await browser.close();
    } catch (error) {
        console.error(error);
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
