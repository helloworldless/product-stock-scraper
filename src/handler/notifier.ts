'use strict';

import * as AWS from 'aws-sdk';

const region = process.env.AWS_REGION;
if (!region) {
    throw new Error(`Missing env var 'AWS_REGION'`);
}

const TopicArn = process.env.SNS_TOPIC_ARN;
if (!TopicArn) {
    throw new Error(`Missing env var 'SNS_TOPIC_ARN'`);
}

AWS.config.update({ region });

const sns = new AWS.SNS();
module.exports.notify = async (event) => {
    console.log('Event', JSON.stringify(event, null, 2));
    try {
        const params = {
            TopicArn: TopicArn,
            Message: event.Records[0].body,
        };
        console.log(`Publish SNS message to topic=${TopicArn}`);
        const result = await sns.publish(params).promise();
        console.log('SNS publish result: ', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error(error);
    }
};
