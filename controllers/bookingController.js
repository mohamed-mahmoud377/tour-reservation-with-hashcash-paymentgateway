const Tour = require("./../models/tourModel");
const axios = require("axios")
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Booking= require("./../models/bookingModel")
const User= require("./../models/userModel")
const catchAsync = require('./../utils/catchAsync')

const factory = require('./handlerFactory')

function sleep(seconds)
{
    var e = new Date().getTime() + (seconds * 1000);
    while (new Date().getTime() <= e) {}
}

exports.getCheckoutSession = catchAsync(async (req,res,next)=>{

    //1 get the currently booked tour
    const  tour= await Tour.findById(req.params.tourId);
    try{
        const response  = await axios.post('http://www.hashcash.digital/api/checkout/',{
            secretKey:process.env.HASHCASH_SECRET,
            customer:{
                email:req.user.email,
                name:req.user.name,
            },
            items:[
                {
                    ID:req.params.id,
                    name:`${tour.name} Tour`,
                    description:tour.summary,
                    image:`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
                    amount:tour.price,
                    quantity:1,
                }
            ],
            currency:"EGP",
            successUrl:`${req.protocol}://${req.get('host')}/?tour=${tour.id}&user=${req.user.id}&price=${tour.price}`,
            cancelUrl:`${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
            clientReferenceId:req.user.id


        },{
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
        console.log(response.data.data);
        sleep(2);
        const response2  = await axios.post('http://www.hashcash.digital/api/checkout/my-checkout',{
            checkoutSession:response.data.data
        },{
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        })
        console.log(  response2.data.data.checkoutUrl);

        res.status(200).json({
            status: 'success',
            checkoutUrl:response2.data.data.checkoutUrl
        })

    }catch (e) {
        console.log(JSON.stringify(e));
        console.log(e);
        console.log(e.toString());
    }


    //create checkout session
    // const session = await stripe.checkout.sessions.create({   //////////////////////////////////////////////////
    //     payment_method_types: ['card'],
    //     // success_url: `${req.protocol}://${req.get('host')}/?tour=${tour.id}&user=${req.user.id}&price=${tour.price}`, // in case if the payment success
    //     success_url:`${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    //     cancel_url:`${req.protocol}://${req.get('host')}/tour/${tour.slug}`, // in case the user canceling the image
    //     customer_email: req.user.email,
    //     client_reference_id: req.params.tourId,
    //     line_items: [{
    //         name: `${tour.name} Tour`,
    //         description: tour.summary,
    //         images:[`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
    //         amount: tour.price * 100, //because it will be in cent
    //         currency: 'usd',
    //         quantity: 1
    //
    //     }]
    //
    //
    // })
    //create session as response




})


// we used this before using webhooks from stripe which is so much better
// exports.createBookingCheckout = catchAsync(async (req,res,next)=>{
//     //this only temp
//     const {tour,user,price} = req.query;
//     if(!tour&&!user&&!price) return next();
//     await Booking.create({tour,user,price});
//     // we do this not just call next because we don't want to pass the query string to the url to make the app more secure
//    res.redirect(req.originalUrl.split('?')[0]);
//
// })


const createBookingCheckout = async session=>{
    console.log("we know should be creating booking");
    const tourId = session.Items[0].ID;
    const user = await User.findOne({email:session.clientEmail});
    const price = session.amount_total ;
    console.log(tourId, user,price);
    await Booking.create({tour:tourId,user:user.id,price});
    console.log('book created');

}

exports.webhookCheckout =catchAsync(async(req,res,next)=>{

    const {secretKey,payment} = req.body
    console.log(req.body);
    console.log(secretKey);
    console.log(payment);

    if (secretKey!==process.env.HASHCASH_WEBHOOK_SECRET)
        return res.status(400).json({error:`webhook error: ${e.message}`});
    await createBookingCheckout(payment)

    // let event;
    // try{
    //     const signature = req.headers['stripe-signature'];
    //      event =stripe.webhooks.constructEvent(req.body,signature,process.env.STRIPE_WEBHOOK_SECRET) ;// that's why we need it in a raw format because stripe said so :(
    //
    // }catch (e) {
    //         return res.status(400).json({error:`webhook error: ${e.message}`});
    // }
    // if(event.type==='checkout.session.completed'){
    //     await createBookingCheckout(event.data.object)
    // }
    res.status(200).json({done:true});


})



exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.UpdateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);


