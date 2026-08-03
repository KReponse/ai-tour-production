export const imageUrl = (image)=>{

 if(!image)
   return "/placeholder.jpg";


 return `http://localhost:5000/uploads/${image}`;

};