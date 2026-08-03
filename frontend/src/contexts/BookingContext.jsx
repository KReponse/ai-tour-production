// src/contexts/BookingContext.jsx

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const BookingContext =
  createContext();

export const BookingProvider = ({
  children,
}) => {

  const [bookings, setBookings] =
    useState([]);

  /**
   * LOAD BOOKINGS
   */
  useEffect(() => {

    const savedBookings =
      localStorage.getItem(
        'bookings'
      );

    if (savedBookings) {

      setBookings(
        JSON.parse(savedBookings)
      );
    }

  }, []);

  /**
   * SAVE BOOKINGS
   */
  useEffect(() => {

    localStorage.setItem(
      'bookings',
      JSON.stringify(bookings)
    );

  }, [bookings]);

  /**
   * ADD BOOKING
   */
  const addBooking = (
    bookingData
  ) => {

    setBookings((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...bookingData,
      },
    ]);
  };

  /**
   * REMOVE BOOKING
   */
  const removeBooking = (id) => {

    setBookings((prev) =>
      prev.filter(
        (booking) =>
          booking.id !== id
      )
    );
  };

  /**
   * CLEAR BOOKINGS
   */
  const clearBookings = () => {

    setBookings([]);
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        addBooking,
        removeBooking,
        clearBookings,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () =>
  useContext(BookingContext);