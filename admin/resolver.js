// resolvers.js


const sampleBooks = [
  { title: 'Book 1', author: 'Author A' },
  { title: 'Book 2', author: 'Author B' },
];

const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL Server!', // Yahan string return ho raha hai
    books: () => sampleBooks, // Yahan upar wala array return ho raha hai
    products: async() => {
      //db call
    }
  },
};

export default resolvers;