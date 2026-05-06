// Validation for Login 
function validateEmail(email) {
  const emailError = document.getElementById("email-error");
  email=email.trim();
  if(!email){
    emailError.textContent="Email is required."
    return false;
  }
 

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    emailError.textContent="Enter a valid email."
    return false;
  } 
  
  
  if(email.length>254){
    emailError.textContent="Email should be of maximum 254 characters length."
    return false;
  }
  emailError.textContent=""
    return true;
 
}

function validatePassword(password) {
  const passwordError = document.getElementById("password-error");
    if(!password){
      passwordError.textContent="Password is required."
      return false;
    }
  passwordError.textContent="";
  return true
}

function validateForm(email,password) {
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);

  if (isEmailValid && isPasswordValid) {
    return true;
  } else {
    return false;
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const isFormValid = validateForm(email,password);
  if (!isFormValid) {
    return;
  }
  

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        { email:email.trim().toLowerCase(), 
        password:password
      }),
    });

    if (response.ok) {
      const data = await response.json();
      location.href = data.redirectUrl;
    } else {
      const data = await response.json();
      Swal.fire("Error", data.message, "error");
    }
  } catch (error) {
    Swal.fire("Error", "Error while login", "error");
  }
}

document.getElementById("email").addEventListener("input", (e) => {
  validateEmail(e.target.value.trim());
});
document.getElementById("password").addEventListener("input", (e) => {
  validatePassword(e.target.value);
});


