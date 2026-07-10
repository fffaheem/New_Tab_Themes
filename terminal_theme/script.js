(() => {

  let elements = {
    body: document.querySelector("body"),
    cmdout: document.querySelectorAll('.cmdout'),
    cmdinput: document.querySelector('.cmdinput'),
    cmdinputprev: document.querySelectorAll('.cmdinputprev'),
  }


  function updateElements() {
    elements = {
      body: document.querySelector("body"),
      cmdout: document.querySelectorAll('.cmdout'),
      cmdinput: document.querySelector('.cmdinput'),
      cmdinputprev: document.querySelectorAll('.cmdinputprev'),
    }
  }

  function blinkUpdate() {
    console.log(elements.cmdinput)
    elements.cmdinput.focus();
  }

  function disablePrevious() {
    updateElements()

    let i = elements.cmdout.length - 2
    if (i < 0) return; 
    let cmdinput = elements.cmdout[i].querySelector(".cmdinput").value
    let user = elements.cmdout[i].querySelector(".user")
    
    let div = document.createElement("div");
    div.classList.add("cmdout");
    div.append(user);
    
    let adiv = document.createElement("div");
    adiv.classList.add("cmdinputprev")
    adiv.innerText = cmdinput
    div.append(adiv)
    
    elements.cmdout[i].replaceWith(div)
    
  }

  // event listeners
  // blink when webpage first reload
  window.addEventListener("DOMContentLoaded", () => {
    // blinkUpdate()
  });

  // when user click anywhere it should only focus the latest
  window.addEventListener("click", (e) => {
    // console.log(elements.cmdinputs)
    // updateElements()
    // blinkUpdate()
  })

  // what should happen when enter
  window.addEventListener("keydown", (e) => {
    // updateElements()

    if (e.key !== 'Enter') {
      return;
    }
    
    if (e.target.value === "") {
      let div = document.createElement("div");
      div.innerHTML = `<div class="user">Admin</div>
      <input class="cmdinput" type="text">`
      div.classList.add("cmdout");
      elements.body.append(div)
    } else {
      let div = document.createElement("div");
      div.innerHTML = `<div class="user">Admine</div>
      <input class="cmdinput" type="text">`
      div.classList.add("cmdout");
      elements.body.append(div)
    }
    
    disablePrevious()
    updateElements()
    blinkUpdate()
    
    
  })


  function init() {
    
  }

  init();

  
})();