# Basic AWS CDK (Cloud Development Kit)

Or how to provision AWS resources using well-known programming languages.

Notes from November 2022, corrected and completed. There is a working project in
[`projects/first_project`](projects/first_project) that the walkthrough below builds up to, so
the samples here are the code that actually synthesizes and passes tests rather than snippets
typed into a document.

Official guide: https://docs.aws.amazon.com/cdk/v2/guide/home.html

## What it is, and why

CloudFormation describes infrastructure as data: YAML or JSON that lists resources and their
properties. That is fine until you want a loop, a conditional, a shared default, or a unit
test, at which point you are writing a templating language on top of a data format.

The CDK lets you write the same infrastructure in TypeScript, JavaScript, Python, Java, C# or
Go, and then **synthesizes** it into a CloudFormation template. So you get the language you
already use, with its types, editor completion, packaging and test tooling, and CloudFormation
still does the deployment: change sets, rollback, drift detection.

What that buys you concretely:

- **Sensible defaults.** A CDK L2 construct for a resource applies AWS's recommended settings
  rather than making you remember each one.
- **Real abstraction.** A function that takes an environment name and returns a configured
  stack is just a function, not a nested-stack parameter dance.
- **Tests.** You can assert on the synthesized template before deploying anything. The tests
  in this repository are that: they check the generated CloudFormation, and they need no AWS
  account to run.

The cost is a build step, a dependency tree, and a template you did not write by hand, so
`cdk synth` is worth reading when something surprises you.

## Pre reqs

### Install Node

https://nodejs.org/en/

The CDK CLI runs on Node regardless of which language you write your app in.

### Install the AWS CLI

https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

Then configure credentials: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html

```
aws configure
```

The CDK reads credentials and region from the same places the AWS CLI does. For a new local
setup AWS recommends IAM Identity Center over long-lived access keys:
https://docs.aws.amazon.com/cdk/v2/guide/configure-access.html

## AWS CDK

### Install the AWS CDK CLI

```shell
npm install -g aws-cdk

cdk --version
```

Sample output:

```
2.1136.0 (build 536ad69)
```

Two things about that command, both from AWS's own CLI documentation:

- **No `sudo`.** A global install runs the package's install scripts, and `sudo` runs them as
  root. If `npm install -g` fails on permissions, the fix is a Node version manager or an
  `npm config set prefix` in your home directory, not elevating the install.
- **You can skip `-g` entirely.** Install `aws-cdk` as a project dev dependency and call it
  with `npx cdk`, which is what `projects/first_project` does. That pins the CLI per project
  instead of having one global version for all of them, so two projects can use two versions.

> The previous version of these notes linked to the *AWS SDK for JavaScript v2* install page
> here, which documents `npm install aws-sdk`. That is a different product, and that SDK
> version has since reached end of support. The CDK CLI is `aws-cdk`.

### How the pieces fit

1. You write a **CDK application**.
2. The CDK CLI **synthesizes** it into a CloudFormation template and deploys the template,
   which provisions the resources.

### Some basic terminology

App -> Stack -> Constructs

1. **App**: the root construct, holding one or more stacks. Being the root, it takes no scope.
1. **Stack**: a unit of deployment, mapping one-to-one to a CloudFormation stack.
1. **Construct**: a component representing one or more AWS resources and their configuration.

In code (`projects/first_project/bin/first_project.ts`):

```ts
import * as cdk from 'aws-cdk-lib';
import { FirstProjectStack } from '../lib/first_project-stack';

const app = new cdk.App();
new FirstProjectStack(app, 'FirstProjectStack', {});
```

The second argument is the construct **id**, unique among its siblings. CDK combines the ids
along the tree to derive CloudFormation logical ids, and **strips anything non-alphanumeric**
while doing so, which is why a construct called `Lambda ARN` shows up as `LambdaARN`.

### Construct levels

AWS categorises library constructs into **three** levels, each a higher abstraction than the
last. Higher means easier to configure and less to know; lower means more control and more to
know.

| Level | Also called | What it is |
| --- | --- | --- |
| **L1** | *CFN resources* | No abstraction. Each L1 maps directly to a single CloudFormation resource, and you set that resource's properties yourself. Named `Cfn` + the resource, so `CfnBucket` is `AWS::S3::Bucket`. Generated from the CloudFormation resource specification, so anything in CloudFormation is available. |
| **L2** | *curated* | The commonly used kind. Still maps to a single resource, but through an intent-based API with sensible defaults, best-practice security policies, and helper methods that generate the boilerplate and glue. `s3.Bucket`, `lambda.Function`. |
| **L3** | *patterns* | The highest abstraction. A **collection** of resources configured to work together for a specific task, so you get a whole architecture from a few lines. `ecsPatterns.ApplicationLoadBalancedFargateService` is a Fargate service on an ECS cluster behind an application load balancer. |

> Two corrections to the earlier version of these notes. There is no **L0**: AWS's own
> documentation defines three levels and the term appears nowhere in it. And **L3 is not "a
> combination of L1 and L2"**; it is a pattern that composes multiple *resources* for a use
> case. The distinction matters because it tells you what you are giving up: an L3 makes
> opinionated decisions across several resources at once.

Source: https://docs.aws.amazon.com/cdk/v2/guide/constructs.html

### synth, bootstrap and deploy

These three get conflated, and they do quite different things.

**`cdk synth`** runs your app and produces the CloudFormation template, writing the cloud
assembly to `cdk.out` and printing the template. For **this** app it needs no AWS account, and
that is a property of the app rather than of `synth`: a stack that performs a context lookup
(`Vpc.fromLookup`, `HostedZone.fromLookup`, `StringParameter.valueFromLookup`,
`stack.availabilityZones`) **queries your account during synthesis** and caches the answer in
`cdk.context.json`. Worth knowing: the CLI synthesizes fresh templates before most operations
anyway, including `deploy`, so `synth` is for *reading* the output rather than a step you must
run first.

**`cdk bootstrap`** provisions the resources the CDK itself needs in an account and region: an
S3 bucket for assets such as bundled Lambda code, an ECR repository for container images, and
IAM roles for deployment. It is **once per account and region**, not once per project, and it
is only needed for stacks that use those resources. Two consequences worth stating:

- **It costs money.** The bucket and repository bill for what they hold.
- **It grants broad permissions.** AWS's own wording: the modern bootstrap template
  "effectively grants the permissions implied by the `--cloudformation-execution-policies` to
  any AWS account in the `--trust` list", which by default is permission to read and write any
  resource in the bootstrapped account.

**`cdk deploy`** synthesizes, uploads any assets, then creates or updates the CloudFormation
stack.

### Some useful commands

* `cdk ls` lists the stacks in the app
* `cdk diff` compares the app against what is deployed, including an IAM and security-group
  change summary
* `cdk synth` synthesizes the CloudFormation template
* `cdk deploy` deploys it
* `cdk destroy` deletes the stack
* `cdk deploy --hotswap` updates supported resources **directly, bypassing CloudFormation
  change sets**. Read the next section before using it: it does **not** fall back to a normal
  deployment.
* `cdk deploy --hotswap-fallback` does the same but falls back when hot swapping is not
  possible.

### On `--hotswap`, and why the AWS docs disagree with the CLI

Taking the pinned CLI's own help as the authority, since it is what you run:

> `--hotswap` Attempts to perform a 'hotswap' deployment, but **does not fall back to a full
> deployment if that is not possible. Instead, changes to any non-hotswappable properties are
> ignored.** Do not use this in production environments
>
> `--hotswap-fallback` Attempts to perform a 'hotswap' deployment, which skips CloudFormation
> and updates the resources directly, and **falls back to a full deployment** if that is not
> possible. Do not use this in production environments

So the flag to reach for is almost always `--hotswap-fallback`. Plain `--hotswap` **ignores**
anything it cannot hot swap: it prints them (`non-hotswappable changes were found:`, naming the
resource types it could not handle) but does not deploy them, so the command succeeds while your
change is not live. Not silent, then, but easy to miss in a deploy that reports success, and that
is the failure mode worth knowing about.

`cdk watch` **implies `--hotswap`** per the same help, so it inherits that behaviour. Use
`--no-hotswap` with it for full deployments.

⚠️ **AWS's own CLI reference page contradicts this**, and an earlier version of these notes
repeated it. That page still says *"Deployment falls back to AWS CloudFormation deployment if
hot swapping is not possible"* and *"The `--hotswap` flag also disables rollback (i.e., implies
`--no-rollback`)"*. Neither matches the CLI pinned here: the fallback is a separate flag, and
the help contains no relationship between hotswap and rollback at all. The page describes the
behaviour from before the flag was split in two. It also lists three supported resource types
where the current deploy documentation lists many more, so treat the list as a floor.

When the documentation and the tool disagree, the tool wins, and `cdk deploy --help` settles it
in one command.

## The example: a Hello World Lambda

The finished version is committed under [`projects/first_project`](projects/first_project). To
run it without creating anything in AWS:

```shell
cd projects/first_project
npm install
npm test          # tsc --noEmit && jest, asserting on the synthesized template
npx cdk synth     # prints the CloudFormation, no AWS account needed
```

### Building it from scratch

```shell
mkdir first_project
cd first_project

cdk init app --language typescript
```

`cdk init` needs an empty directory and generates `bin/`, `lib/`, `test/`, `cdk.json`,
`package.json` and `tsconfig.json`.

Then create a directory for the function's source:

```shell
mkdir lambda
touch lambda/app.ts
```

> **`app.ts`, not `app.js`.** The stack below points `entry` at a TypeScript file, and the
> earlier version of these notes said to create `app.js` while pointing `entry` at `app.ts`.
> That fails synthesis with `«CannotFindEntryFile» Cannot find entry file at .../lambda/app.js`,
> which is the kind of mistake the committed tests now catch.

#### The handler

`lambda/app.ts`:

```ts
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export async function helloWorld(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const name = process.env.NAME ?? 'World';

  return {
    body: JSON.stringify({ message: `Hello World, ${name}` }),
    statusCode: 200,
  };
}
```

The types come from `@types/aws-lambda`, which is a dev dependency.

#### The stack

`lib/first_project-stack.ts`:

```ts
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class FirstProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, 'HelloWorld', {
      runtime: Runtime.NODEJS_22_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      handler: 'helloWorld',
      entry: join(__dirname, '../lambda/app.ts'),
      environment: {
        NAME: 'Peter',
      },
    });

    new CfnOutput(this, 'LambdaArn', {
      value: handler.functionArn,
    });
  }
}
```

**Use `NodejsFunction`, not `Function`, when the handler is TypeScript.** `NodejsFunction`
takes `entry` (a source file) and runs [esbuild](https://esbuild.github.io/) to transpile and
bundle it; `Function` takes `code` (a directory or archive) and would deploy a `.ts` file the
Node runtime cannot execute. Keep `esbuild` installed locally, or the construct falls back to
bundling inside Docker.

`handler: 'helloWorld'` is the **exported function name**, and it has to match the export in
`app.ts`. The synthesized template shows `Handler: index.helloWorld`, because the bundle is
written as `index.js`.

> **On the runtime.** These notes originally used `Runtime.NODEJS_16_X`. Per AWS's Lambda
> runtimes table, `nodejs16.x` was **deprecated on 2024-06-12**, with function creation blocked
> from **2027-02-01** and updates from **2027-03-03**. A deprecated runtime gets no security
> patches and is not eligible for support. `nodejs18.x` and `nodejs20.x` are also deprecated;
> **Node 22 and 24** are the supported versions, hence `NODEJS_22_X`.
>
> Check before copying:
> https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

#### Environment variables

The `environment` block above becomes the function's environment, read as `process.env.NAME`
in the handler. Note this puts the value **in the CloudFormation template in plain text**, so
it is right for configuration and wrong for secrets. For those, read from Secrets Manager or
Parameter Store at runtime, or pass a reference rather than the value.

#### Outputs

`CfnOutput` becomes a CloudFormation stack output, printed after a deploy:

```
Outputs:
FirstProjectStack.LambdaArn = arn:aws:lambda:us-west-1:ACCOUNT_ID:function:FirstProjectStack-HelloWorld7BCF4C30-qoGBFllWIum4
```

### Deploying it

From the project root:

```shell
npx cdk bootstrap    # once per account and region; see the note above on cost and permissions
npx cdk synth
npx cdk deploy
```

`npx cdk` rather than a bare `cdk`, to use the version pinned in this project's
`devDependencies` rather than whatever is installed globally. A bare `cdk` works too if you did
the global install above.

Answer the prompt: `Do you wish to deploy these changes (y/n)? y`

That creates a CloudFormation stack, here `FirstProjectStack`. You can then invoke the
function from the console, creating a test event first.

Sample output:

```
Test Event Name
Test

Response
{
  "body": "{\"message\":\"Hello World, Peter\"}",
  "statusCode": 200
}

Function Logs
START RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29 Version: $LATEST
END RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29
REPORT RequestId: c9004084-9f1e-4487-a4bb-b1f9bf6d7f29	Duration: 2.33 ms	Billed Duration: 3 ms	Memory Size: 256 MB	Max Memory Used: 57 MB	Init Duration: 142.56 ms
```

The identifiers above are from the original 2022 run and are kept rather than rewritten.

### Clean up

The original notes stopped at `deploy`, which leaves a Lambda, a log group and the bootstrap
resources behind. To remove them:

```shell
cdk destroy
```

The bootstrap stack is separate and survives `cdk destroy`, because it is shared by every CDK
project in that account and region. Only remove it if nothing else uses it:

```shell
aws cloudformation delete-stack --stack-name CDKToolkit
```

Empty the bootstrap S3 bucket first, or the delete fails on a non-empty bucket. Log groups also
outlive the stack unless the construct is configured to remove them.

## What changed, and why

Verified against AWS's own documentation and by running the project, not from memory.

- **The CDK install link installed the wrong product.** Under "Install AWS CDK for JS" it
  pointed at the AWS SDK for JavaScript v2 page, whose command is `npm install aws-sdk` and
  which now opens with an end-of-support notice. The CDK CLI is `aws-cdk`.
- **`sudo npm install -g aws-cdk`** became `npm install -g aws-cdk`, with the local `npx cdk`
  alternative documented. AWS's own docs use no `sudo`.
- **`cd first_projectx`** was a typo after `mkdir first_project`, so the walkthrough's third
  command failed.
- **`touch app.js` then `entry: '.../app.ts'`.** Following the notes produced a file the stack
  did not point at. Measured: synthesis fails with `CannotFindEntryFile`.
- **The construct levels were wrong.** `L0` is not AWS terminology and appears nowhere in
  their construct documentation, `L2` was an empty placeholder, and `L3: combination of L1 and
  L2` is not what an L3 is. All three now carry AWS's own definitions.
- **`Runtime.NODEJS_16_X`** is deprecated, with the dates above.
- **`cdk deploy --hotswap`** was described as "deploys just what we changed", which omits that
  it bypasses CloudFormation change sets and, more importantly, that it does **not** fall back
  to a normal deployment: non-hotswappable changes are silently ignored. `--hotswap-fallback`
  is the variant that falls back. This section was itself corrected after review: it first
  repeated AWS's CLI reference page, which still describes the pre-split behaviour and claims
  the flag implies `--no-rollback`. The pinned CLI's help says otherwise, and it is what runs.
- **There was no clean-up section**, for a walkthrough that bootstraps an account and deploys a
  function.
- **There was no `.gitignore`**, while the walkthrough tells you to create a CDK app inside this
  repository. Following it produces `cdk.out` and a compiled `.js`/`.d.ts` beside every source
  file, none of which were ignored. Corrected after review: an earlier version of this list also
  claimed the walkthrough produces `cdk.context.json`, and the `.gitignore` excluded that file.
  Both were wrong. This app performs no context lookups, so none is generated, and AWS is explicit
  that the file **must** be committed when a lookup does generate one, since it is part of the
  application's state. The `.gitignore` no longer excludes it and explains when to commit one,
  and why to read it first: its keys embed the account id.
- **Three TODO comments** were published in the README, marking what a reader most needs: what
  the CDK is and why, the construct-level definitions, and what bootstrap and synth do. All
  three sections are now written.
- **Two links worked only through a redirect** (`nodejs.dev/en/`, and the CLI configure
  quickstart) and now point at their current locations.
- **The example is committed** and covered by 8 tests asserting on the synthesized
  CloudFormation, where before there was no code at all.

## Not covered

- **Nothing here has been deployed to AWS.** There are no credentials in this environment. The
  project synthesizes, type-checks and passes its tests locally; `cdk bootstrap` and
  `cdk deploy` are unverified, and the recorded console output is from the original 2022 run.
- **The `cdk destroy` and `delete-stack` clean-up commands are likewise unrun here.** They come
  from AWS's documented behaviour rather than from a measured teardown.
- **No API Gateway.** The handler is typed for `APIGatewayProxyEventV2` because that is what the
  original notes used, but nothing fronts the function, so it is invoked directly. The event
  type is aspirational rather than wired up.
- **L1 and L3 constructs are described but not demonstrated.** The example uses a single L2
  (`NodejsFunction`).
- **`aws-cdk-lib` is pinned at one version**, so the notes match a specific library. CDK
  releases weekly and construct APIs do get new properties; check the current docs before
  assuming a sample is complete.
