import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class FirstProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // NodejsFunction, not Function, because the handler is TypeScript: it runs esbuild to
    // transpile and bundle, and takes `entry` (a source file) where Function takes `code`
    // (a directory or archive). Using Function with a .ts entry point deploys a file the
    // Node runtime cannot execute.
    const handler = new NodejsFunction(this, 'HelloWorld', {
      // NODEJS_22_X, not NODEJS_16_X. Per the AWS Lambda runtimes table, nodejs16.x was
      // deprecated on 2024-06-12, with function creation blocked from 2027-02-01 and
      // updates from 2027-03-03. A deprecated runtime receives no security patches and is
      // not eligible for support, so these notes would otherwise teach a reader to start a
      // new function on one. Node 22 and 24 are the supported versions.
      runtime: Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'helloWorld',
      entry: join(__dirname, '../lambda/app.ts'),
      environment: {
        NAME: 'Peter',
      },
      bundling: {
        // The Lambda runtime ships the AWS SDK, so bundling it would add megabytes to the
        // asset for nothing. This handler imports no SDK client, so this is about the
        // default rather than about this function.
        minify: true,
      },
    });

    // Construct ids are alphanumeric here on purpose. CDK strips other characters when it
    // derives the CloudFormation logical id, so 'Hello World' and 'Lambda ARN' still work
    // but produce a logical id that does not match what you typed. The output below is
    // named LambdaArn, which is what appears in the deploy output.
    new CfnOutput(this, 'LambdaArn', {
      value: handler.functionArn,
      description: 'ARN of the Hello World function',
    });
  }
}
