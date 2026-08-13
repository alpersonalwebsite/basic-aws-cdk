#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FirstProjectStack } from '../lib/first_project-stack';

const app = new cdk.App();

new FirstProjectStack(app, 'FirstProjectStack', {
  // Environment-agnostic on purpose, which is the CDK default: one synthesized template can
  // be deployed to any account and region, and `cdk deploy` uses whatever your CLI is
  // configured for.
  //
  // The original notes hardcoded `region: 'us-west-1'` and called it optional. It is worth
  // knowing what hardcoding costs: the stack then deploys only there, and CDK cannot do
  // context lookups (AMI ids, availability zones, hosted zones) without an account either,
  // so a stack that needs them must specify BOTH. Prefer the CDK_DEFAULT_* variables, which
  // take the values from the credentials in use rather than from a literal in the source:
  //
  //   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  //
  // See https://docs.aws.amazon.com/cdk/v2/guide/environments.html
});
