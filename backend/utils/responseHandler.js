const response = (res,statusCode,message,data=null)=>{
    if(!res){
        console.error("Response is not defined");
        return;
    }

    const responseObject = {
        status: statusCode < 400 ? "success" : "error",
        message,
        data
    }

    return res.status(statusCode).json(responseObject);
}

module.exports = response;