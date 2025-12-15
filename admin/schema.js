// schema.js
import { gql } from 'graphql-tag';

const typeDefs = gql`
  type Query {
    # Yeh ek simple function hai jo string return karegi
    hello: String
    # Yeh function Book type ki array return karegi
    books: [Book] 

    products:[products]
  }

  type products{
    title:String
    description:String
    price:Int
  
  }

  type Book {
    title: String
    author: String
  }
`;

export default typeDefs;