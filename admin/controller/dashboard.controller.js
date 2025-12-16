

const addCatagory = async (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ err: "no data recieve" });

  try {
    const result = await Catagories.create({
      name: name,
    });

    res.send(result);
  } catch (error) {}
};

// controller
const uploadProduct = async (req, res) => {
  const transaction = await connection.transaction();
  try {
    const files = req.files || [];
    const {
      name,
      title,
      price,
      quantity,
      sku,
      description,
      catagory,
      specification,
      selling_price,
      selling_price_link,
    } = req.body;

    // parse specs (same as before)
    let specsArr = [];
    if (specification) {
      const parsed = JSON.parse(specification);
      specsArr = Object.entries(parsed).map(([key, value]) => ({ key, value }));
    }

    // Validate files count
    if (!files.length)
      return res
        .status(400)
        .json({ message: "At least one image is required." });
    if (files.length > 5)
      return res.status(400).json({ message: "Maximum 5 images allowed." });

    // Find or create category
    // console.log(`🔵 Looking for category: "${catagory}"`);
    let result = await Catagories.findOne({
      where: { name: catagory },
    });

    if (!result) {
      // Category doesn't exist, create it
      // console.log(`⚠️ Category "${catagory}" not found, creating it...`);
      return res
        .status(404)
        .json({ status: false, Message: "Category not found" });
      // try {
      //   result = await Catagories.create({
      //     name: catagory,
      //   }, { transaction });
      //   console.log(`✅ Created new category: "${catagory}" with id: ${result.id}`);
      // } catch (createError) {
      //   console.error('❌ Error creating category:', createError);
      //   await transaction.rollback();
      //   return res.status(500).json({ message: "Failed to create category", error: createError.message });
      // }
    }
    const catagory_id = result.id;

    // Upload each file to Supabase and collect public URLs
    const uploadedImageUrls = [];
    for (const file of files) {
      const filePath = `product-images/${uuidv4()}-${file.originalname}`;
      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (error)
        throw new Error(
          "Supabase upload failed: " + (error.message || JSON.stringify(error))
        );

      const { data: publicUrlData } = supabase.storage
        .from("products")
        .getPublicUrl(data.path);

      uploadedImageUrls.push(publicUrlData.publicUrl);
    }

    // Create product (ensure product_id matches your model column name)
    // NOTE: use the actual primary key column name your Products model expects.
    // const productId = uuidv4();

    // let imageurl = {...uploadedImageUrls}

    let imageUrl = { ...uploadedImageUrls };

    const newProduct = await Products.create(
      {
        title,
        name,
        price: Number(price),
        product_image: imageUrl, //all images url in json form
        description,
        selling_price: Number(selling_price),
        catagory_id: catagory_id,
        quantity: quantity,
        sku: sku,
        selling_price_link: selling_price_link,
      },
      { transaction }
    );

    const productId = newProduct.product_id;
    if (specsArr.length > 0) {
      const specsWithProductId = specsArr.map((s) => ({
        ...s,
        product_id: productId,
      }));
      await ProductSpecification.bulkCreate(specsWithProductId, {
        transaction,
      });
    }

    // Insert ProductImages rows
    // const imageRows = uploadedImageUrls.map((url) => ({
    //   id: uuidv4(),
    //   product_id: productId,
    //   image_url: url,
    // }));
    // await ProductImages.bulkCreate(imageRows, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Product uploaded successfully!",
      product: newProduct,
      images: uploadedImageUrls,
    });
  } catch (error) {
    console.error("Server error:", error);
    if (transaction) await transaction.rollback();
    res
      .status(500)
      .json({
        message: "Something went wrong on the server.",
        error: error.message,
      });
  }
};

const getOrders = async (req, res) => {
  try {
    const data = await Orders.findAll({
      include: [
        {
          model: OrderItems,
          as: "items",
          include: [
            {
              model: Products,
            },
          ],
        },
      ],
    });

    const ordersWithPaymentInfo = data.map((order) => {
      return {
        ...order.toJSON(),
        payment_method: "Payoneer",
      };
    });

    if (ordersWithPaymentInfo.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json({
      status: true,
      orders: ordersWithPaymentInfo,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// const getOrders = async (req, res) => {
//   try {
//     const data = await Orders.findAll({
//       include: [{ model: Products }]
//     });

//     // Simplify payment information - always show PayU since it's the only payment method
//     const ordersWithPaymentInfo = data.map(order => {
//       return {
//         ...order.toJSON(),
//         payment_method: 'PayU', // Always set to PayU since it's the only payment method
//         payu_transaction_id: order.payu_payment_id || null // Use the PayU payment ID as transaction ID
//       };
//     });

//     if (ordersWithPaymentInfo.length === 0) {
//       return res.status(404).json({ message: "No orders found" });
//     }

//     res.status(200).json({ status: true, orders: ordersWithPaymentInfo });
//   } catch (error) {
//     console.error("Error fetching orders:", error);
//     res.status(500).json({ message: "Something went wrong", error: error.message });
//   }
// };

const updateOrderStatus = async (req, res) => {
  const { status, order_id, product_id } = req.body; // Destructure outside for clarity
  
  // 1. Initial Validation
  if (!status || !order_id) {
    return res.status(400).json({ message: "Required fields missing: status or order_id." });
  }

  // Use a transaction for atomic updates to prevent race conditions
  const t = await connection.transaction(); 

  try {
    if (status === "confirm") {
        
      if (!product_id) {
        // Only product_id is required for a 'confirm' status
        await t.rollback();
        return res.status(400).json({ message: "product_id is required for status 'confirm'." });
      }

      // 2. Fetch the specific ordered item quantity (scoped to order and product)
      const orderItem = await OrderItems.findOne({
        where: { order_id: order_id, product_id: product_id },
        attributes: ["quantity"],
        transaction: t, 
      });

      if (!orderItem) {
        await t.rollback();
        return res.status(404).json({ message: "Product not found in this order." });
      }

      const quantityToDeduct = orderItem.quantity;

      // 3. Fetch product quantity and perform stock check/reduction
     
      const product = await Products.findByPk(parseInt(product_id), {
        attributes: ["quantity"],
        transaction: t, // MUST run this query inside the transaction
      });

      if (!product || product.quantity < quantityToDeduct) {
        await t.rollback();
        return res.status(400).json({ 
          status: false,
          message: "Insufficient stock to confirm this quantity." 
        });
      }
      
      const newQty = product.quantity - quantityToDeduct;

      // 4. Update product quantity (inside transaction)
      await Products.update(
        { quantity: newQty },
        { where: { product_id: product_id }, transaction: t }
      );

      // 5. Update order status and payment status (inside transaction)
      const [updatedOrder] = await Orders.update(
        { status: status, payment_status: "paid" },
        { where: { order_id: order_id }, transaction: t }
      );

      if (updatedOrder === 0) {
        await t.rollback();
        return res.status(404).json({ message: "Order not found or already updated." });
      }

    } else {
      // Logic for non-confirm statuses (e.g., 'shipped', 'cancelled')
      const [updated] = await Orders.update(
        { status: status },
        { where: { order_id: order_id }, transaction: t }
      );

      if (updated === 0) {
        await t.rollback();
        return res.status(404).json({ message: "Order not found" });
      }
    }

    // Commit the transaction only if all steps succeeded
    await t.commit(); 

    return res.status(200).json({ message: "Order status updated successfully" });

  } catch (error) {
    // If any step failed, rollback the transaction
    await t.rollback(); 
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const login = (req, res) => {
  const { userName, password } = req.body;
  if (!userName || !password) {
    return res.status(400).json({ msg: "userName and Password required" });
  }

  const checkUserName = process.env.ADMIN_USERNAME;
  const checkPassword = process.env.PASSWORD;
  if (checkUserName === userName && checkPassword === password) {
    return res.status(200).json({ status: true, msg: "Login successfull" });
  } else {
    return res.status(401).json({ status: false, msg: "Can't login" });
  }
};

// const updateProduct = async (req, res) => {
//   try {
//     const { product_id } = req.params;
//     const { price, selling_price, quantity } = req.body;

//     // Validate required fields
//     if (price === undefined && selling_price === undefined && quantity === undefined) {
//       return res.status(400).json({ message: "At least one field (price, selling_price, quantity) is required" });
//     }

//     // Find the product
//     const product = await Products.findByPk(product_id);
//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // Prepare update object
//     const updateData = {};
//     if (price !== undefined) {
//       updateData.price = Number(price);
//     }
//     if (selling_price !== undefined) {
//       updateData.selling_price = Number(selling_price);
//     }
//     if (quantity !== undefined) {
//       updateData.quantity = Number(quantity);
//     }

//     // Update the product
//     await product.update(updateData);
//     res.status(200).json({
//       status: true,
//       message: "Product updated successfully",
//       product: product
//     });
//   } catch (error) {
//     console.error('❌ Error updating product:', error);
//     res.status(500).json({ message: "Failed to update product", error: error.message });
//   }
// };

const updateProduct = async (req, res) => {
  const transaction = await connection.transaction();

  try {
    const { product_id } = req.params;
    const files = req.files || [];

    const {
      name,
      title,
      price,
      quantity,
      sku,
      description,
      catagory,
      specification,
      selling_price,
      selling_price_link,
    } = req.body;

    // 1️⃣ Find product
    const product = await Products.findByPk(product_id);
    if (!product) {
      return res
        .status(404)
        .json({ status: false, message: "Product not found" });
    }

    // 2️⃣ Validate category
    const categoryData = await Catagories.findOne({
      where: { name: catagory },
    });
    if (!categoryData) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    // 3️⃣ Parse specifications
    let specsArr = [];
    if (specification) {
      const parsed = JSON.parse(specification);
      specsArr = Object.entries(parsed).map(([key, value]) => ({ key, value }));
    }

    // 4️⃣ If new images uploaded → upload to Supabase
    let finalImages = product.product_image; // keep old images if no new ones

    if (files.length > 0) {
      if (files.length > 5) {
        return res.status(400).json({ message: "Maximum 5 images allowed." });
      }

      // Delete old images from Supabase
      const oldImages = Object.values(product.product_image);
      for (const imgUrl of oldImages) {
        const filePath = decodeURIComponent(imgUrl.split("/products/")[1]);
        await supabase.storage
          .from("products")
          .remove([`product-images/${filePath}`]);
      }

      // Upload new images
      const newUrls = [];
      for (const file of files) {
        const filePath = `product-images/${uuidv4()}-${file.originalname}`;
        const { data, error } = await supabase.storage
          .from("products")
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) throw new Error("Supabase upload failed: " + error.message);

        const { data: publicUrlData } = supabase.storage
          .from("products")
          .getPublicUrl(data.path);

        newUrls.push(publicUrlData.publicUrl);
      }

      finalImages = { ...newUrls };
    }

    // 5️⃣ Update Product
    await product.update(
      {
        title,
        name,
        price: Number(price),
        quantity,
        sku,
        description,
        selling_price: Number(selling_price),
        catagory_id: categoryData.id,
        selling_price_link,
        product_image: finalImages,
      },
      { transaction }
    );

    // 6️⃣ Update Specifications
    await ProductSpecification.destroy(
      { where: { product_id } },
      { transaction }
    );

    if (specsArr.length > 0) {
      const specsWithId = specsArr.map((s) => ({ ...s, product_id }));
      await ProductSpecification.bulkCreate(specsWithId, { transaction });
    }

    await transaction.commit();
    res
      .status(200)
      .json({ status: true, message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating full product:", error);
    await transaction.rollback();
    res
      .status(500)
      .json({ status: false, message: "Server error", error: error.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Products.findAll({
      include: [
        {
          model: Catagories,
          attributes: ["id", "name"],
          required: false, // Left join - include products even if category is missing
        },
      ],
      order: [["product_id", "DESC"]],
    });
    res.status(200).json({ status: true, products: products });
  } catch (error) {
    console.error("❌ Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId)
      return res
        .status(404)
        .json({ status: false, Message: "Cant not remove product." });

    const { product_image } = await Products.findOne({
      where: { product_id: productId },
      attributes: ["product_image"],
    });

    const imagesEntries = Object.entries(product_image);
    let imageName = null;
    for (const [key, imageUrl] of imagesEntries) {
      imageName = decodeURIComponent(imageUrl.split("/").pop());

      console.log(`image name : ${imageName}`);

      const { error } = await supabase.storage
        .from("products")
        .remove([`product-images/${imageName}`]);

      if (error) {
        console.log("Error removing:", imageUrl, error);
      } else {
        console.log("Removed:", imageUrl);
      }
    }

    // delete product from db
    await Products.destroy({
      where: { product_id: parseInt(productId) },
    });

    res
      .status(200)
      .json({ status: true, Message: "Product Deleted successfully" });
  } catch (error) {
    console.error(error);

    res.status(500).json({ status: false, Message: "Something went wrong" });
  }
};

export {
  getProducts,
  updateProduct,
  addCatagory,
  uploadProduct,
  login,
  getOrders,
  updateOrderStatus,
};
