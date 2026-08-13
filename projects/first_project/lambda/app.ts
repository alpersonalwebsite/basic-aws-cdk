import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * The handler the stack points at by name.
 *
 * `NodejsFunction` takes `handler: 'helloWorld'` and `entry: <this file>`, so the exported
 * name here and the string in the stack have to match. Renaming one without the other
 * produces a runtime error rather than a build error, which is why the test asserts on the
 * synthesized Handler property.
 */
export async function helloWorld(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  // Set by the stack's `environment` block. Typed as `string | undefined`, so the fallback
  // is not decoration: without it the response reads "Hello World, undefined" whenever the
  // variable is missing, which is exactly what a misconfigured deploy looks like.
  const name = process.env.NAME ?? 'World';

  return {
    body: JSON.stringify({ message: `Hello World, ${name}` }),
    statusCode: 200,
  };
}
