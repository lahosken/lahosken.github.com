!function ($) {
  $(function(){

    // Disable fake js-enabling href="#whatever" links
    $('section [href^=#]').click(function (e) {
      e.preventDefault()
    })

    var car = $('#mainCarousel')
    car.carousel({interval: false}) /* Don't auto-advance */
    car.click(function(ev){
      if (ev && ev.target && ev.target.href) { return /* don't hijack links */ }
      car.carousel("next")
    })
    $('#prevBtn').click(function(ev){
      car.carousel("prev")
      ev.preventDefault()
    })
    var toIx = function(hash) {
      var children = car.find('.item.active').parent().children()
      var pos = children.index($(hash)) || 0
      car.carousel(pos)
    }

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
    if (document.location && document.location.hash) {
      toIx(document.location.hash)
    }
  })
}(window.jQuery)
