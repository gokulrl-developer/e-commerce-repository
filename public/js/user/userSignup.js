function validateFullName() {
  let fullName = document.getElementById("fullName").value;
  const fullNameError = document.getElementById("fullName-error");
  const regex = /^[A-Za-z\s'.-]+$/;

  if (!fullName) {
    fullNameError.textContent = "Full Name is a required field";
    return false;
  }
  fullName = fullName.trim();
  if (fullName.length < 3) {
    fullNameError.textContent = "Minimum size of Full Name is 3 characters long";
    return false;
  }
  if (fullName.length > 50) {
    fullNameError.textContent = "Maximum size of Full Name is 50 characters long";
    return false;
  }
  if (!regex.test(fullName)) {
    fullNameError.textContent = "Only alphabets,spaces,dots,hyphen and apostrophe are allowed in Full Name.";
    return false;
  }
  if (/\s{2,}/.test(fullName)) {
    fullNameError.textContent = "Full Name cannot contain two consecutive spaces.";
    return false;
  };

  fullNameError.textContent = "";
  return true;

}

function validateEmail() {
  let email = document.getElementById("email").value;
  const emailError = document.getElementById("email-error");
  email = email.trim();
  if (!email) {
    emailError.textContent = "Email is required."
    return false;
  }


  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(email)) {
    emailError.textContent = "Enter a valid email."
    return false;
  }


  if (email.length > 254) {
    emailError.textContent = "Email should be of maximum 254 characters length."
    return false;
  }
  emailError.textContent = ""
  return true;
}

function validateContact() {
  let mobile = document.getElementById("contact").value;
  const mobileError = document.getElementById("contact-error");

  const regex = /^[6-9]\d{9}$/;

  if (!mobile) {
    mobileError.textContent = "Mobile Number is required.";
    return false;
  }
  mobile = mobile.trim();
  if (!regex.test(mobile)) {
    mobileError.textContent = "Enter a valid mobile number.";
    return false;
  }
  mobileError.textContent = "";
  return true;
}

function validatePassword() {
  const password = document.getElementById("password").value;
  const passwordError = document.getElementById("password-error");
  if (!password) {
    passwordError.textContent = "Password is required."
    return false;
  }
  const regex =
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,16}$/;

  if (!regex.test(password)) {
    passwordError.textContent =
      "Password must be 8-16 characters long, and include a number, uppercase, lowercase, and special character.";
    return false;
  }

  passwordError.textContent = "";
  return true;
}

function validateConfirmPassword() {
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const confirmPasswordError = document.getElementById("confirm-password-error");
  if(!confirmPassword){
    confirmPasswordError.textContent="Confirm Password is required."
    return false;
  }
  if (confirmPassword !== password) {
    confirmPasswordError.textContent = "Passwords do not match.";
    return false;
  }
    confirmPasswordError.textContent = "";
    return true;
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

  const name = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const mobile = document.getElementById("contact").value.trim();


  try {
    const response = await fetch("/sign-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, mobile }),
    });

    const data = await response.json();
    if (response.ok ) {
      location.href = data.redirectUrl;
    } else {
      Swal.fire("Error", data.message, "error");
    }
  } catch (error) {
    console.log('error')
  }
}





