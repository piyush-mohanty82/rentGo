// Function to check availiability of car for a given date

import { response } from "express";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

//find existing bookings for this car whose date range overlaps with the new user's requested date range

////API to check availability of car for a given date
const checkAvailability = async (car,pickupDate,returnDate) => {
    const bookings = await Booking.find({
        car,
        pickupDate: {$lte: returnDate},
        returnDate: {$gte: pickupDate},
    })
    return bookings.length === 0; // if 0 then no overlapping bookings, particular car is available
}

//API to check availability of car for a given date and location

export const checkAvailabilityOfCar = async (req,res) => {
    try {
        // Get location, pickup date and return date sent by the user
       const {location,pickupDate,returnDate} = req.body;

       // Find all cars that:
        // 1. Are present in the requested location
        // 2. Are currently marked as available by the owner
       const cars = await Car.find({location,isAvaliable: true});

       // For every car, check whether it is available
        // for the requested pickup and return dates

       const availableCarsPromises = cars.map(async (car)=>{
         // Check the Booking collection to see whether
            // this particular car has any conflicting booking
        const isAvailable = await checkAvailability(car._id,pickupDate,returnDate)
        // Create a new object containing all the car information
            // and update isAvaliable with the result of the date check
        return {...car._doc,isAvailable :isAvailablee}
       })

       // Wait for all the availability checks to finish
        // Promise.all() converts the array of Promises into actual results
       let availableCars = await Promise.all(availableCarsPromises);

       // Remove cars that are already booked for the requested dates
        // Only keep cars whose date availability is true
       availableCars = availableCars.filter(car => car.isAvailable===true);

       // Send the available cars back to the frontend
       res.json({success: true,availableCars})
    } catch (error) {
        console.log(error.message);
        res.json({success: false,message: error.message})
    }
}

// API to create Booking
export const createBooking = async (req,res) => {
    try {
        const { _id } = req.user;
        const {car, pickupDate, returnDate} = req.body;

        const isAvailable = await checkAvailability(car,pickupDate,returnDate);

        if(!isAvailable){
            return res.json({success: false,message: "Car is not available"})
        }

        const carData = await Car.findById(car);

        //calculate price based on pickupDate and return date
        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);

        const noOfDays = Math.ceil((returned - picked)/(1000*60*60*24));
        const price = carData.pricePerDay * noOfDays;

        const booking = await Booking.create({
            car,
            owner: carData.owner,
            user: _id,
            pickupDate,
            returnDate,
            price
        })
        res.json({success: true,message: "Booking created"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false,message: error.message})
    }
}

// API to get user bookings
export const getUserBookings = async (req,res) => {
    try {
        const {_id} = req.user;
        const bookings = await Booking.find({user: _id}).populate("car").sort({createdAt:-1});
        res.json({success: true,bookings})
    } catch (error) {
        console.log(error.message);
        res.json({success: false,message: error.message})
    }
}

//API to get owner bookings
export const getOwnerBookings = async (req,res) => {
    try {
       if(req.user.role !== "owner") {
        return res.json({success: false,message: "Unauthorized"})
       }
       const bookings = await Booking.find({owner: req.user._id}).populate("car user").select("-user.password").sort({createdAt:-1});
       res.json({success: true,bookings})
    } catch (error) {
        console.log(error.message);
        res.json({success: false,message: error.message})
    }
}

// API to change booking status
export const changeBookingStatus = async (req,res) => {
    try {
       const {_id} = req.user;
       const {bookingId,status} = req.body;

       const booking = await Booking.findById(bookingId);

       if(booking.owner.toString() !== _id.toString()){
        return res.json({success: false,message: "Unauthorized"})
       }

       booking.status = status;
       await booking.save();

       res.json({sucess: true,message: "Status Updated"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false,message: error.message})
    }
}