# Basic AWS CDK (Cloud Development Kit)
Or how to provide AWS resources using well known programming languages.

More info: https://docs.aws.amazon.com/cdk/v2/guide/home.html

<!-- 
  TODO:
  What is?
  Why?
-->

## Pre reqs

### Instal Node
https://nodejs.dev/en/

### Install AWS CLI
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

Then run `aws configure`
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html

## AWS CDK

### Install AWS CDK for JS
https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/installing-jssdk.html

1. With the AWS CDK we create a CDK application.
2. With the CDK cli we synthesize the source code (CDK application) into a CloudFormation template and deploy the template (provisioning our AWS resources).


```shell
sudo npm install -g aws-cdk

cdk --version
```

Sample output:

```
2.50.0 (build 4c11af6)
```

### Some basic terminology
App -> Stack -> Constructs

1. App: root construct with one or more stacks (since it is the root, it doesn't require a scope).
1. Stack: has constructs; deployed as a unit.
1. Constructs: define AWS resources.

In code:

```ts
import * as cdk from 'aws-cdk-lib';
import { FirstProjectStack } from '../lib/first_project-stack';

const app = new cdk.App();
new FirstProjectStack(app, 'FirstProjectStack', {
});
```

More concepts:

<!--
  TODO:
    Definitions ofL0,  L1, L2 and L3
-->

1. L0
1. L1 constructs (CfnTable, CfnBucket...): represents the CFN resource. Example: CfnTable represents AWS::DynamoDB::Table
1. L2 construct
1. L3: combination of L1 and L2

### Some useful commands

* `cdk diff` is going to compare what changes we have between our local environment and what we have deployed
* `cdk synth` synthesizes de CFN template
* `cdk deploy`
* `cdk deploy --hotswap` deploys just what we changed

## Examples

### Hello World Lambda

```
mkdir first_project
cd first_projectx

cdk init app --language typescript
```

Create a folder (inside first_project) for particular resources, example: `lambda`

```
mkdir lambda
cd lambda

touch app.js
```

THIS IS OPTIONAL... Open and edit: `basic-aws-cdk/projects/first_project/bin/first_project.ts`

I wanted to added a hardcoded `region`.
If you don't add this, the CDK is going to use your default region.

```ts
  env: {
    region: 'us-west-1'
  },
```


Open and edit: `basic-aws-cdk/projects/first_project/lambda/app.ts`

Code:

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export async function helloWorld(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  return {
    body: JSON.stringify({message: 'Hello World!'}),
    statusCode: 200
  }
}
```


Open and edit: `basic-aws-cdk/projects/first_project/lib/first_project-stack.ts`

Code:

```ts
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class FirstProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // We use this to define that the resource is going to be part of the stack FirstProjectStack
    const handler = new NodejsFunction(this, 'Hello World', {
      runtime: Runtime.NODEJS_16_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'helloWorld',
      entry: join(__dirname, `/../lambda/app.ts`),

      // If we want to minify our code and exclude `aws-sdk` from the bundle
      // bundling: {
      //   minify: true,
      //   externalModules: ['aws-sdk'],
      // },
    });
  }
}
```

**IMPORTANT NOTE:**

Since we are using TS for our lambda (check: basic-aws-cdk/projects/first_project/lambda/app.ts) we HAVE TO USE `NodejsFunction` instead of `Function` class, and `entry` instead of `code`.

`NodejsFunction` relies in `esbuild` to transpile and bundle our code.


Go to the root of `first_project` and execute:

```
cdk bootstrap
```

<!-- 
  TODO: what is bootstrap and what is synth
-->

Then...

```
cdk synth
```

And now we can deploy:

```
cdk deploy
```

Accept deploying changes: `Do you wish to deploy these changes (y/n)? y`

This is going to create a new stack in CloudFormation. Example: `FirstProjectStack`


Now we can go to the console and test our Lambda.
(Note: remember to create first a test event)

Sample output:

```
Test Event Name
Test

Response
{
  "body": "{\"message\":\"Hello World!\"}",
  "statusCode": 200
}

Function Logs
START RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29 Version: $LATEST
END RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29
REPORT RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29	Duration: 2.33 ms	Billed Duration: 3 ms	Memory Size: 256 MB	Max Memory Used: 57 MB	Init Duration: 142.56 ms

Request ID
c9004084-9f1e-4487-a4bb-b1f9bf6d7f29
```

### Working with environment variables and outputs

#### Environment variables
We are going to use the previous example

##### Adding the environment variables
projects/first_project/lib/first_project-stack.ts

```ts
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class FirstProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // We use this to define that the resource is going to be part of the stack FirstProjectStack
    const handler = new NodejsFunction(this, 'Hello World', {
      runtime: Runtime.NODEJS_16_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'helloWorld',
      // code: Code.fromAsset(join(__dirname, '../lambda'))
      entry: join(__dirname, `/../lambda/app.ts`),
      environment: {
        NAME: 'Peter'
      }
    });
  }
}
```

##### Accessing the environment variables
projects/first_project/lambda/app.ts

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export async function helloWorld(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {

  const name = process.env.NAME;

  return {
    body: JSON.stringify({message: `Hello World, ${name}`}),
    statusCode: 200
  }
}
```

#### Outputs
projects/first_project/lib/first_project-stack.ts

```ts
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnOutput } from 'aws-cdk-lib';

export class FirstProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // We use this to define that the resource is going to be part of the stack FirstProjectStack
    const handler = new NodejsFunction(this, 'Hello World', {
      runtime: Runtime.NODEJS_16_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'helloWorld',
      // code: Code.fromAsset(join(__dirname, '../lambda'))
      entry: join(__dirname, `/../lambda/app.ts`),
      environment: {
        NAME: 'Peter'
      }
    });

    new CfnOutput(this, 'Lambda ARN', {
      value: handler.functionArn
    })

  }
}
```

After deploying (cdk deploy) you will see something like this:

```
Outputs:
FirstProjectStack.LambdaARN = arn:aws:lambda:us-west-1:ACCOUNT_ID:function:FirstProjectStack-HelloWorld7BCF4C30-qoGBFllWIum4
```