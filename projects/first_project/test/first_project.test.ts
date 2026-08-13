import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FirstProjectStack } from '../lib/first_project-stack';

/**
 * These assertions run against the CloudFormation that CDK actually synthesizes, which is
 * the only way to check that what the notes claim matches what the stack produces. The
 * generated placeholder test asserted nothing (its body was entirely commented out), so
 * `npm test` passed on a stack that did not exist.
 *
 * Synthesis runs esbuild to bundle lambda/app.ts, so these tests also fail if the handler
 * does not compile or the `entry` path is wrong. That is deliberate: the original README
 * said to create `app.js` and then pointed `entry` at `app.ts`, and nothing would have
 * caught it.
 */
function synth(): Template {
  const app = new cdk.App();
  const stack = new FirstProjectStack(app, 'TestStack');
  return Template.fromStack(stack);
}

describe('FirstProjectStack', () => {
  test('creates exactly one Lambda function', () => {
    synth().resourceCountIs('AWS::Lambda::Function', 1);
  });

  test('the function uses a SUPPORTED runtime, not a deprecated one', () => {
    const template = synth();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
    });
    // The specific regression this guards: nodejs16.x was deprecated 2024-06-12.
    //
    // This denylist is hardcoded, and deliberately, because there is no CDK-native
    // alternative: Runtime exposes name, family, supportsInlineCode, supportsSnapStart and a
    // few others, but NOT a deprecation flag. Verified against aws-cdk-lib 2.264.0 that
    // Runtime.NODEJS_16_X.isDeprecated and Runtime.NODEJS_22_X.isDeprecated are both
    // `undefined`, so a generic "assert the runtime is supported" test cannot be written.
    //
    // Consequence to plan for: this list needs editing when Node 22 is deprecated, currently
    // forecast for 2027-04-30. The AWS runtimes table is the source:
    // https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
    const functions = template.findResources('AWS::Lambda::Function');
    const runtimes = Object.values(functions).map((f) => f.Properties?.Runtime);
    expect(runtimes).not.toContain('nodejs16.x');
    expect(runtimes).not.toContain('nodejs18.x');
    expect(runtimes).not.toContain('nodejs20.x');
  });

  test('the handler name matches the exported function', () => {
    // NodejsFunction rewrites `handler` to `index.<name>` for the bundled asset, so this
    // asserts the export name survives rather than hardcoding the whole string.
    synth().hasResourceProperties('AWS::Lambda::Function', {
      Handler: Match.stringLikeRegexp('helloWorld$'),
    });
  });

  test('memory and timeout are the documented values', () => {
    synth().hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 256,
      Timeout: 5,
    });
  });

  test('the NAME environment variable reaches the function', () => {
    synth().hasResourceProperties('AWS::Lambda::Function', {
      Environment: { Variables: { NAME: 'Peter' } },
    });
  });

  test('the stack outputs the function ARN', () => {
    const outputs = synth().findOutputs('*');
    const keys = Object.keys(outputs);
    expect(keys).toHaveLength(1);
    // CDK strips non-alphanumeric characters from construct ids when deriving logical ids,
    // which is why the README's original 'Lambda ARN' appeared as LambdaARN in the deploy
    // output. Asserting the key catches a rename that would break anything reading it.
    expect(keys[0]).toBe('LambdaArn');
    expect(outputs.LambdaArn.Value).toBeDefined();
  });

  test('the function gets an execution role with the basic execution policy', () => {
    const template = synth();
    template.resourceCountIs('AWS::IAM::Role', 1);
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Principal: { Service: 'lambda.amazonaws.com' },
          }),
        ],
      },
    });
  });

  test('no wildcard resource appears in any inline policy', () => {
    // A guard rather than a description of a bug: the L2 NodejsFunction construct is what
    // writes these policies, and this fails if someone later adds a permissive one by hand.
    const policies = synth().findResources('AWS::IAM::Policy');
    for (const policy of Object.values(policies)) {
      const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
      for (const statement of statements) {
        expect(statement.Resource).not.toBe('*');
      }
    }
  });
});
