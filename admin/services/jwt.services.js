import jwt from 'jsonwebtoken'


export const generateAccessToken = (payload,secret) =>{
     return new Promise((resolve,reject)=>{
            jwt.sign(payload,secret,{expiresIn:'15m'},(err,result)=>{
                if(err) return reject(err)
              return resolve(result)
            })          
        
     })
}

export const verifyToken = (token,secret) =>{
  return new Promise((resolve,reject)=>{
     jwt.verify(token,secret,(err,result)=>{
          if(err) return reject(err);
          return resolve(result)
     })
  })
}