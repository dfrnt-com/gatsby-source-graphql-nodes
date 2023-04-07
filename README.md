<p align="center">
  <a href="https://www.gatsbyjs.com">
    <img alt="Gatsby" src="https://www.gatsbyjs.com/Gatsby-Monogram.svg" width="60" />
  </a>
</p>
<h1 align="center">
  Plugin for sourcing nodes/content/files from GraphQL queries 
</h1>

## Description

This plugin sources nodes from an external GraphQL query. That enables cascaded nodes creation and transformation, for content stores without their own connector. Primarily built for [DFRNT.com](https://dfrnt.com?utm_source=gatsby) and [TerminusCMS](https://terminusdb.com) data products, but is useful for other GraphQL endpoints.

Similarly to `gatsby-source-graphql` it does not support Incremental Builds, CMS Preview. Through the `onCreateNode`, graphql content can repurposed and children nodes created from them. That provides necessary flexilibility to build static websites from data products, knowledge graphs and digital twins.

The original aim was to build a plugin to feed MDX and Frontmatter from knowledge graph data products at DFRNT into the `gatsby-transform-remote-mdx` plugin. Thus it enables both MDX and images to be processed from a GraphQL endpoint. Thanks to the Gatsby node creation flexibility, it could form a base for most kinds of GraphQL-based content sourcing.

PRs and issues are welcome to add additional capabilities to the plugin!

### Dependencies

Create a configuration and things should work!

### Learning Resources

* Make sure the GraphQL queries work by visiting the [localhost GraphQL endpoint](http://localhost:8000/___graphql)
* Make sure that the TOKEN .env file is properly created

## How to install

### 🚀 Quick start, step 1: prerequisites

1. Install this plugin and prerequisites
2. Configure the GraphQL queries and the fields to make available
3. Restart gatsby and if necessary, make a `gatsby clean`

### 2. Install plugin and prerequisites

```shell
npm install gatsby-transform-remote-mdx @mdx-js/react
```

### 3. Configure the plugins in gatsby-config.js

```javascript
module.exports = {
  plugins: [
    plugins: [
    {
      resolve: "@dfrnt/gatsby-source-graphql-dfrnt",
      options: {
        url: "https://dfrnt.com/api/RustyGearsInc/api/graphql/RustyGearsInc/website",
        graphqlConfig: {
          headers: {
            Authorization: `Token ${process.env.TERMINUSDB_TOKEN}`,
          },
        },
        // Note that the fields will be made available under `data` in the node
        // see the configuration for gatsby-transform-remote-mdx
        query: `{
          MyNodeType {
            _id
            _type
            label
            statement {
              markdown
            }
            frontmatter {
              excerpt
              slug
              title
              category {
                label
              }
              author {
                label
                href
                imageUrl
              }
              og {
                image
                title
                type
                url
              }
            }
          }
        }
        `,
    
        typeConfiguration: {
          "MyNodeType": {
            typeNameOverride: "BlogpostOverride",
            idField: "_id",
          }
        },
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "images",
        path: "./src/images/",
      },
      __key: "images",
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "pages",
        path: "./src/pages/",
      },
      __key: "pages",
    },
    {
      resolve: `gatsby-transform-remote-mdx`,
      options: {
        mdxNodeTypes: {
          "MyNodeType": {
            // If a hierarchy of objects is to be traversed, use a dot (.) for each level
            mdxField: "data.statement.markdown",
            mdxFrontmatterField: "data.frontmatter",
            gatsbyImageClassName: "rounded-md shadow-md"
          }
        },
        preprocessImages: true
      }
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        gatsbyRemarkPlugins: [
          {
            // The regular gatsby-remark-images does not support remote images.
            // A different plugin may be required
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1200,
            },
          },
        ],
      },
    },

  ],
}
```

### 4. Start gatsby

```shell
gatsby develop
```

## Options

This plugin reflects the data retrieved through queries as source nodes.

| Option  | Type                                                 | Description                                                                                                                                                  | Required |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| url    | `string`                                             | The `url` to the GraphQL endpoint must be specified                                                   | true     |
| graphqlConfig  | `object` | This field configures headers such as `Authorization` that are necessary to connect to the GraphQL endpoint                                                                                                | false    |
| query  | `string` | The GraphQL query, each type will be represented in the local GraphQL endpoint and can be queried in the node api, for example when for `createPages`                                                                                                | true    |
| typeConfiguration  | `object` | Each key in `typeConfiguration` must match a type name in the GraphQL query. `typeNameOverride` renames the type into a local type name, `idField` is a reference to the field used as the stable ID for the node.                                                                                                | true    |


Example configuration options below:

```javascript
module.exports = {
  plugins: [
    {
      resolve: "@dfrnt/gatsby-source-graphql-dfrnt",
      options: {
        url: "https://dfrnt.com/api/RustyGearsInc/api/graphql/RustyGearsInc/website",
        graphqlConfig: {
          headers: {
            Authorization: `Token ${process.env.TERMINUSDB_TOKEN}`,
          },
        },
        // Note that the fields will be made available under `data` in the node
        // see the configuration for gatsby-transform-remote-mdx
        query: `{
          MyNodeType {
            _id
            _type
            label
            statement {
              markdown
            }
            frontmatter {
              excerpt
              slug
              title
              category {
                label
              }
              author {
                label
                href
                imageUrl
              }
              og {
                image
                title
                type
                url
              }
            }
          }
        }
        `,
    
        typeConfiguration: {
          "MyNodeType": {
            typeNameOverride: "MyNodeTypeOverride",
            idField: "_id",
          }
        },
      }
    },
  ]
}
```

## When do I use this plugin?

When you are sourcing remote GraphQL data, you need to get it into the Gatsby cache first. This plugin helps you accomplish bringing data from a remote GraphQL endpoint, into a local cached copy in the local Gatsby GraphQL endpoint.

This plugin does not, and should probably not, handle any other tasks such as bringing sharp images and similar functionality, this is handled through downstream plugins, such as `gatsby-transform-remote-mdx` that we created for processing MDX.


### `gatsby-node.js` createPages section

In below createPages example we use `getNode()` to resolve the node. The reason is that there is some interoperability issue, where at least one local mdx node is required for the GraphQL types to be properly created. Using createPages like below is a workaround for that issue.

Therefore the suggestion to create at least one real local MDX file, any page really, so that the GraphQL configuration is updated for Mdx nodes. If so, a regular GraphQL query can be used.

```javascript
import path from 'path';
exports.createPages = async ({ graphql, actions, reporter, getNode }) => {
  const { createPage, createNode } = actions;
  const result= await graphql(`
    query {
      allMyNodeTypeOverride {
        nodes {
          id
          label
          frontmatter {
            slug
          }
        }
      }
    }
  `);

  result.data.allMyNodeTypeOverride.nodes.forEach((node) => {
    // For some reason, the fields are not showing up in GraphQL...
    createPage({
      path: `/${(node?.frontmatter).slug}`,
      component: path.resolve(`./src/layouts/page.jsx`),
      ownerNodeId: `dfrnt-graphql`,
      // The context is passed as props to the component as well
      // as into the component's GraphQL query.
      context: {
        ...node,
      },
    });
  });
};
```

## Troubleshooting

No known recurring issues yet


### In general

Getting it all to work relies on a correct cache. Many things are helped by starting over with the cache, using `gatsby clean`. Depending on your situation, it can be helpful to try!

## How to develop locally

```shell
git clone https://github.com/dfrnt-com/gatsby-source-graphql-dfrnt
npm install
```

It is suggested to run `npm link` in the directory, and then run `npm link gatsby-source-graphql-dfrnt` in the `example-site` used for development.

## How to contribute

If you have unanswered questions, would like help with enhancing or debugging the plugin, add issues and pull requests to [dfrnt-com/gatsby-source-graphql-dfrnt](https://github.com/dfrnt-com/gatsby-source-graphql-dfrnt).

This is a project offered as-is to the community under the MIT license. Contributions are more than welcome! Please visit the [DFRNT data product builder](https://dfrnt.com) to learn more about building websites from knowledge graphs using data products with strong data models in TerminusDB data products.