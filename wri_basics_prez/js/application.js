!function ($) {

  $(function(){

    // Disable certain links in docs
    $('section [href^=#]').click(function (e) {
      e.preventDefault()
    })

    var car = $('#mainCarousel')
    var next = function(ev){
      car.carousel("next")
      ev.preventDefault()
    }
    var prev = function(ev){
      car.carousel("prev")
      ev.preventDefault()
    }
    car.carousel({interval: false})
    car.click(next)
    var prevBtn = $('#prevBtn')
    prevBtn.click(prev)

    document.onkeydown = next;
  })
}(window.jQuery)
