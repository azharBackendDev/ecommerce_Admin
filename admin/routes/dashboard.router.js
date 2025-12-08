import { router } from "../app.js";
import {addCatagory,uploadProduct,getProducts,updateProduct,getOrders,updateOrderStatus,login,deleteProduct} from "../controller/dashboard.controller.js";
// import  {upload } from '../middleware/multer.middleware.js';



router.post('/add-catagory',addCatagory);
router.post('/login',login)


router.post('/upload-product', upload.array('images', 5), uploadProduct);
router.get('/get-products',getProducts);
router.patch('/update-product/:product_id',upload.array('images',5),updateProduct);
router.get('/get-orders',getOrders);
router.patch('/update-order-status',updateOrderStatus);
router.delete('/delete-product',deleteProduct)


export {router};