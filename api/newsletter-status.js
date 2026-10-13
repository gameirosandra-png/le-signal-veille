const n=require('../lib/newsletter');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({available:false});
 try{n.config();return res.status(200).json({available:true});}
 catch{return res.status(200).json({available:false});}
};
