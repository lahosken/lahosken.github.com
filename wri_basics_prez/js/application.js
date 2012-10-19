!function ($) {

  $(function(){

    // Disable certain links in docs
    $('section [href^=#]').click(function (e) {
      e.preventDefault()
    })

    var car = $('#mainCarousel')
    var prev = function(ev){
      car.carousel("prev")
      ev.preventDefault()
    }
    car.carousel({interval: false})
    car.click(function(ev){
      car.carousel("next")
      ev.preventDefault()
    })
    var prevBtn = $('#prevBtn')
    prevBtn.click(prev)

    document.onkeydown = function(ev){
      var HANDLERS = { // map keyCode -> direction
        37: "prev", // left arrow
        38: "next", // right arrow
        32: "next", // space
        72: "prev", // h, for vim nerds
        76: "next", // l, for vim nerds
      }
      if (ev.keyCode && HANDLERS[ev.keyCode]) {
	  car.carousel(HANDLERS[ev.keyCode])
	  ev.preventDefault()
          return
      }
      if (ev.altGraphKey || ev.altKey || ev.ctrlKey || ev.metaKey) {
	  // If user presses Ctrl-C, we don't want the Ctrl or the C
	  // Don't do anything, don't preventDefault, just
	  return
      }
      car.carousel("next")
      ev.preventDefault()
    }
  })
}(window.jQuery)
