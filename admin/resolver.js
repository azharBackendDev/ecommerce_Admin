// resolvers.js
import Product from './model/product.model.js'

const sampleBooks = [
  { title: 'Book 1', author: 'Author A' },
  { title: 'Book 2', author: 'Author B' },
];

const resolvers = {
  Query: {
    // hello: () => 'Hello from GraphQL Server!', // Yahan string return ho raha hai
    // books: () => sampleBooks, // Yahan upar wala array return ho raha hai
    getAllProducts: async() => await Product.find() ,
    getDraftProducts: async() => await Product.find({isActive:false})
     
  },
};

export default resolvers;