// Validation for Login 
function validateEmail() {
    const email = document.getElementById("email").value;
    const emailError = document.getElementById("email-error");
  
    const startsWithNumber = /^[0-9]/.test(email);
  
    if (startsWithNumber) {
      window.alert("Email ID cannot start with a number.");
      return false; 
    }
  
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  
    if (!regex.test(email)) {
        window.alert("Enter a valid email Id.");
        return false;
    } else {
      return true;
    }
  }
  
  function validatePassword() {
    const password = document.getElementById("password").value;
    const passwordError = document.getElementById("password-error");
    const regex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;
  
    if (!regex.test(password)) {
      window.alert("Password must be 8-16 characters long, and include a number, uppercase, lowercase, and special character.");
      return false;
    } else {
      return true;
    }
  }
  
  function validateForm() {
    const isEmailValid=validateEmail();
    const isPasswordValid=validatePassword();
  
    if(isEmailValid && isPasswordValid){
    return true;}else{
        return false;
    }
  }
  
  async function handleLogin(event) {
    event.preventDefault();
    const isFormValid = validateForm();
    if (!isFormValid) {
      return;
    }
  
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({email, password}),
      });
      
      if (response.ok) {
        const data = await response.json();
          location.href = data.redirectUrl;
      } else {
        const data = await response.json();
        Swal.fire("Error",data.message,"error");
      }
    } catch (error) {
      Swal.fire("Error","Error while login","error");
    }
  }
  
  
  
  
  