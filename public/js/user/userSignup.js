function validateFullName() {
    const fullName = document.getElementById("fullName").value;
    const fullNameError = document.getElementById("fullName-error");
    const regex = /^[A-Za-z\s]+$/;
  
    if (!regex.test(fullName)) {
      fullNameError.textContent = "Only alphabets are allowed.";
      return false;
    } else {
      fullNameError.textContent = "";
      return true;
      }
  }
  
  function validateEmail() {
    const email = document.getElementById("email").value;
    const emailError = document.getElementById("email-error");
  
    const startsWithNumber = /^[0-9]/.test(email);
  
    if (startsWithNumber) {
      emailError.textContent = "Email ID cannot start with a number.";
      return false;
    }
  
    const regex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  
    if (!regex.test(email)) {
      emailError.textContent = "Enter a valid email address.";
      return false;
    } else {
      emailError.textContent = "";
      return true;
    }
  }
  
  function validateContact() {
    const mobile = document.getElementById("contact").value;
    const mobileError = document.getElementById("contact-error");
    const regex = /^[0-9]{10}$/;
  
    if (!regex.test(mobile)) {
      mobileError.textContent = "Only Numbers are allowed.";
      return false;
    } else {
      mobileError.textContent = "";
      return true;
      }
  }

  function validatePassword() {
    const password = document.getElementById("password").value;
    const passwordError = document.getElementById("password-error");
    const regex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;
  
    if (!regex.test(password)) {
      passwordError.textContent =
        "Password must be 8-16 characters long, and include a number, uppercase, lowercase, and special character.";
      return false;
    } else {
      passwordError.textContent = "";
      return true;
    }
  }
  
  function validateConfirmPassword() {
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const confirmPasswordError = document.getElementById("confirm-password-error");
  
    if (confirmPassword !== password) {
      confirmPasswordError.textContent = "Passwords do not match.";
      return false;
    } else {
      confirmPasswordError.textContent = "";
      return true;
    }
  }
  
  function validateForm() {
    const isFullNameValid = validateFullName();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isConfirmPasswordValid = validateConfirmPassword();
    const isContactValid = validateContact();

  
    return (
      isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isContactValid
    );
  }
  
  document.getElementById("fullName").addEventListener("input", validateFullName);
  document.getElementById("email").addEventListener("input", validateEmail);
  document.getElementById("password").addEventListener("input", validatePassword);
  document
    .getElementById("confirmPassword")
    .addEventListener("input", validateConfirmPassword);
    document
    .getElementById("contact")
    .addEventListener("input", validateContact);
  
async function handleSignup(event) {
      event.preventDefault();
    
      const isFormValid = validateForm();
      if (!isFormValid) {
        return;
      }
    
      const name = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const mobile = document.getElementById("contact").value;

    
      try {
        const response = await fetch("/sign-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, password,mobile }),
        });
    
        const data = await response.json();
        if (response.status == 200) {
          location.href = data.redirectUrl;
           
        } else {

          window.alert(data.Message);
        }
      } catch (error) {
        console.log('error')
      }
    }
     
  
  
  
  
 