/*   
  
         //make the cursor automatically moves to next field on inputing otp
  document.addEventListener("DOMContentLoaded",()=>{
    const inputs=document.querySelectorAll(".otp-input");
    inputs.forEach((input,index)=>{
      input.addEventListener("input",(event)=>{
        if(index<inputs.length-1&&event.target.value.length===1){
          inputs[index+1].focus();
          console.log("helloworld")
        }
      });
      input.addEventListener("keydown",(event)=>{
        if(event.key==="Backspace"&&index>0&&!event.target.value){
          input[index-1].focus();
        }
      })
    })
  })

  //handle OTP verification
  async function handleOtpverification(event){
    const inputs=document.querySelectorAll(".otp-input");
    let otp="";
    inputs.forEach((x)=>{
      otp+=x;
    })
   try{
    const response=await fetch('/verify-otp',
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(otp)
      }
    );

   }catch(error){
     console.error("Error while verifying otp : ",error);
   } 
  }


  //handle resend OTP
  async function handleResendOtp(event){
    const inputs=document.querySelectorAll(".otp-input");
    let otp="";
    inputs.forEach((x)=>{
      otp+=x;
    })
   try{
    const response=await fetch('/verify-otp',
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(otp)
      }
    );

   }catch(error){
     console.error("Error while verifying otp : ",error);
   } 
  }


  //handling timer
  function startTimer(duration) {
    let timeRemaining = duration;
    const timerDisplay = document.getElementById("timer");
    const resendButton = document.getElementById("resend-otp");
  
    resendButton.style.display = 'none';
        timer = setInterval(() => {
      if (timeRemaining <= 0) {
        clearInterval(timer);
        timerDisplay.textContent = "Resend the OTP.";
        
        resendButton.style.display = 'block';
      } else {
        timeRemaining--;
        timerDisplay.textContent = `Resend OTP in ${timeRemaining} seconds.`;
      }
    }, 1000);
  } */