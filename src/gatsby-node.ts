import type { GatsbyNode, SourceNodesArgs } from "gatsby";
const { createContentDigest } = require("gatsby-core-utils");
import { GraphQLClient } from "graphql-request";

// Node API reference: https://www.gatsbyjs.com/docs/node-apis/

const pluginName = "@dfrnt/gatsby-source-graphql-nodes";

interface TypeConfiguration {
  typeNameOverride: string;
  idField: string;
}

export const onPreInit: GatsbyNode["onPreInit"] = () => console.log(`Loaded ${pluginName}`);

const createContentNode = async (
  node: any,
  typeConfig: TypeConfiguration,
  typeName: string,
  sourceNodesArgs: SourceNodesArgs
): Promise<void> => {
  const { actions, createNodeId } = sourceNodesArgs;
  const { createNode } = actions;

  const contentDigest = createContentDigest(JSON.stringify(node));
  const id = typeConfig["idField"] && node[typeConfig["idField"]] || createNodeId(contentDigest);
  const nodeId = id ? createNodeId(id) : String(createContentDigest(JSON.stringify(node)));
  const localTypeName = typeConfig.typeNameOverride ?? typeName;
  const nodeData = {
    id: nodeId,
    data: node,
    children: [],
    internal: {
      type: `${localTypeName}`,
      content: JSON.stringify(node),
      contentDigest: createContentDigest(JSON.stringify(node)),
    },
  };

  await createNode(nodeData);
};

const recurseFieldContent = (nodeData: unknown, objectFieldSequence: Array<string>): any => {
  if (objectFieldSequence.length === 0 || !nodeData) {
    return nodeData;
  } else {
    const fieldName = objectFieldSequence[0];
    if (Array.isArray(nodeData)) {
      return recurseFieldContent(nodeData[0], objectFieldSequence);
    } else if (!Array.isArray(nodeData) && typeof nodeData === "object") {
      const fields = objectFieldSequence.slice(1);
      const childNodeData = (nodeData as any)[fieldName];
      return recurseFieldContent(childNodeData, fields);
    } else {
      return undefined;
    }
  }
};


export const sourceNodes: GatsbyNode["sourceNodes"] = async (sourceNodesArgs: SourceNodesArgs, pluginConfig: any) => {

  const clientOptions = {
    headers: pluginConfig.graphqlConfig.headers,
  };

  const client = new GraphQLClient(pluginConfig.url, clientOptions);
  const userQueryResult: any = await client.request(pluginConfig.query).then((data) => data);

  return Object.keys(userQueryResult).forEach(
    async (typeName) =>
      await userQueryResult[typeName].forEach(async (nodeData: any) => {
        await createContentNode(nodeData, pluginConfig.typeConfiguration[typeName], typeName, sourceNodesArgs);
      })
  );
};
