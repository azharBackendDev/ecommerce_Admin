import { gql } from 'graphql-tag';

const typeDefs = gql`
  type Query {
    getAllProducts: [Product]
    getDraftProducts: [Product]
    }

  #type define for product model
  type Product {
    _id: ID
    name: String
    slug: String
    description: String
    price: Float
    brand: String
    category: ID
    images: [String]
    s3Keys: [String]
    stock: Int
    
    attributes:Attribute
    variants: [Variant]
    tags: [String]
    isActive: Boolean
    createdAt: String
    updatedAt: String
  }


#sub-part or Product
  type Attribute {
    color:String
    ram:Int
    storage:String
  }
    
  #sub-part of Product
  type Variant {
    _id: ID
    size: String
    color: String
    stock: Int
    priceAdjustment: Float
  }
`;

export default typeDefs;