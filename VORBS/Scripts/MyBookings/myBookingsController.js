﻿myBookings.controller('MyBookingsController', ['$scope', '$http', '$resource', MyBookingsController]);

function MyBookingsController($scope, $http, $resource) {

    CreateServices($resource);

    $scope.bookings = GetBookings.query({
        startDate: new moment().utc().format("MM-DD-YYYY-HHmm")
        //person: Get PID
    });

    $scope.deleteBookingId = 0;

    $scope.SetBookingId = function (id) {
        $scope.deleteBookingId = id;
    }

    $scope.DeleteBooking = function () {
        Booking.remove(
            {
                bookingId: $scope.deleteBookingId
            },
            function (success) {
                //TODO: Change ?
                location.reload();
            },
            function (error) {
                //TODO:Log Error
                alert('Unable to Delete Booking. Please Try Again or Contact ITSD.');
                location.reload();
            }
        );
    }
}


function CreateServices($resource) {
    GetBookings = $resource('/api/bookings/:startDate/:person', { startDate: 'startDate', person: 'person' },
    {
        query: { method: 'GET', isArray: true }
    });

    GetBookings.prototype = {
        startDateFormatted: function () { return moment(this.startDate).format("DD/MM/YYYY - hh:mm A"); },
        endDateFormatted: function () { return moment(this.endDate).format("DD/MM/YYYY - hh:mm A"); }
    };

    Booking = $resource('/api/bookings/:bookingId', { bookingId: 'bookingId' },
    {
        remove: { method: 'DELETE' }
    });
}