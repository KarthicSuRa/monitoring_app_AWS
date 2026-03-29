const { EventBridgeClient, PutRuleCommand } = require("@aws-sdk/client-eventbridge");

exports.handler = async (event) => {
  const { schedule } = JSON.parse(event.body);
  const ruleName = process.env.RULE_NAME;

  if (!schedule) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "schedule is required" }),
    };
  }

  if (!ruleName) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "RULE_NAME environment variable not set" }),
    };
  }

  const client = new EventBridgeClient({});
  const command = new PutRuleCommand({
    Name: ruleName,
    ScheduleExpression: schedule,
  });

  try {
    await client.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
