﻿(function () {

    angular.module('vorbs.myBookings')
        .controller('MyBookingsController', MyBookingsController);

    MyBookingsController.$inject = ['$scope', 'BookingsService', 'AvailabilityService', 'LocationsService'];

    function MyBookingsController($scope, BookingsService, AvailabilityService, LocationsService) {

        $scope.orderByField = 'date';
        $scope.reverseSort = false;

        $scope.locations = LocationsService.getByStatus({ status: true, extraInfo: false })
            .$promise.then(function (resp) {
                $scope.locations = resp;
            });
        $scope.bookingFilter = {
            location: { name: '', id: 0 },
            room: '',
            startDate: '',
            smartRoom: false
        };

        $scope.bookings = [];
        $scope.SearchBookings = function () {

            BookingsService.search({
                locationId: $scope.bookingFilter.location.id,
                room: $scope.bookingFilter.room,
                startDate: FormatDateTimeForURL($scope.bookingFilter.startDate, 'MM-DD-YYYY', false, false),
                smartRoom: $scope.bookingFilter.smartRoom
            }).$promise.then(function (response) {
                $scope.bookings = response;
            });
        }

        $scope.externalFullNameTextBox = '';
        $scope.externalCompanyNameTextBox = '';
        $scope.externalPassRequired = false;

        $scope.GetBookings = function () {

            var period = 7;
            var startDate = new moment().utc().format("MM-DD-YYYY-HHmm");

            BookingsService.getByPeriod({ startDate: startDate, period: period })
                .$promise.then(function (data) {
                    $scope.bookings = data;
                });
        }

        $scope.GetBookings();

        $scope.bookingId = 0;

        $scope.currentBookingToModify = null;
        $scope.SetBookingId = function (id) {
            $scope.bookingId = id;
            BookingsService.getByID({
                bookingId: id
            }).$promise.then(function (response) {
                $scope.currentBookingToModify = response;
            }, function (error) {
                //TODO: Error Handler
                $scope.currentBookingToModify = null;
            });
        }

        $scope.AddExternalAttendee = function () {
            SetModalErrorMessage('');
            $scope.booking.externalAttendees = AddExternalName($scope.booking.externalAttendees);
            $scope.externalFullNameTextBox = '';
            $scope.externalCompanyNameTextBox = '';
            $scope.externalPassRequired = false;
        }

        $scope.RemoveExternalAttendee = function (index) {
            SetModalErrorMessage('');
            $scope.booking.ExternalNames = RemoveExternalName(index, $scope.booking.externalAttendees);
        }

        $scope.LoadEditBooking = function (bookingId) {
            //Reset Any Error Messages
            SetModalErrorMessage('');
            ResetExternalNamesUI();
            SetEditActiveTab('editBooking');

            $scope.bookingId = bookingId;

            BookingsService.getByID({
                bookingId: bookingId
            }).$promise.then(function (response) {
                $scope.newBooking.Room.RoomName = response.room.roomName;
                $scope.newBooking.Subject = response.subject;
                $scope.newBooking.FlipChart = response.flipchart;
                $scope.newBooking.Projector = response.projector;
                $scope.newBooking.RoomID = response.room.id;
                $scope.newBooking.IsSmartMeeting = response.isSmartMeeting;
                $scope.newBooking.DSSAssist = response.dssAssist;

                if (response.externalAttendees !== null) {
                    $scope.booking.externalAttendees = response.externalAttendees;
                }
                else {
                    $scope.booking.externalAttendees = []; //Reset External Name List
                }

                $scope.booking.numberOfAttendees = response.numberOfAttendees;
                $scope.booking.startTime = FormatTimeDate(response.startDate, false);
                $scope.booking.endTime = FormatTimeDate(response.endDate, false);
                $scope.booking.date = FormatTimeDate(response.startDate, true);

                //Store the vital existing booking data
                $scope.existingBooking.numberOfAttendees = $scope.booking.numberOfAttendees;
                $scope.existingBooking.startTime = $scope.booking.startTime;
                $scope.existingBooking.endTime = $scope.booking.endTime;
                $scope.existingBooking.date = $scope.booking.date;

                if (!response.room.smartRoom || !$scope.newBooking.IsSmartMeeting) {
                    $("#dssAssistChoice").css('display', 'none');
                    $("#dssAssistContWarning").css("display", "none");
                } else {
                    var dssDetails = GetLocationCredentialsFromList("dss", response.location.locationCredentials);
                    if (!dssDetails || dssDetails.email === "") {
                        $("#dssAssistChoice").css('display', 'none');
                        $("#dssAssistContWarning").css("display", "block");
                    } else {
                        $("#dssAssistChoice").css('display', 'block');
                        $("#dssAssistContWarning").css("display", "none");
                    }
                }

                var securityDetails = GetLocationCredentialsFromList(securityCredentialsName, response.location.locationCredentials);
                //if (!securityDetails || securityDetails.email === "") {
                //Overrided existing security department check, as users need to be available to add guests but will be sent an email personally to inform security.
                if (false) {
                    $("#externalAttendeesCont").css("display", "none");

                    var message = "This location does not have a dedicated security desk.";
                    var facilities = GetLocationCredentialsFromList(facilitiesCredentialsName, response.location.locationCredentials);
                    if (facilities) {
                        message = message + " Please contact the local facilities officer at " + facilities.email + " for visitory access protocols.";
                    }
                    $("#externalAttendeesContWarning").text(message);
                    $("#externalAttendeesContWarning").css("display", "block");
                } else {
                    $("#externalAttendeesCont").css("display", "block");
                    $("#externalAttendeesContWarning").css("display", "none");
                }

                var facilitiesDetails = GetLocationCredentialsFromList(facilitiesCredentialsName, response.location.locationCredentials);
                if (!facilitiesDetails || facilitiesDetails.email === "") {
                    $("#additionalEquipmentCont").css("display", "none");
                    $("#additionalEquipmentContWarning").css("display", "block");
                } else {
                    $("#additionalEquipmentCont").css("display", "block");
                    $("#additionalEquipmentContWarning").css("display", "none");
                }
                $("#editModal #bookingDate").datepicker('update');
                $scope.editBooking = response;
            }, function (error) {
                // TODO: Error Handler
                $scope.editBooking = null;
            });
        }

        $scope.CheckEditBooking = function () {
            //Reset Any Error Messages
            SetModalErrorMessage('');

            //Validate Start Date
            if ($scope.booking.date === "") {
                SetModalErrorMessage('Invalid Date.');
                return;
            }

            //Validate Number of External Names is not graether than attendees
            ValidateNoAttendees($scope.editBooking.room.seatCount, $scope.booking.externalAttendees.length);
            $scope.newBooking.NumberOfAttendees = $scope.booking.numberOfAttendees;

            var unsavedAttendee = ValidateUnSavedAttendee();
            if (unsavedAttendee !== "") {
                SetModalErrorMessage(unsavedAttendee);
                return;
            }

            //Validate Times
            var timeValidation = ValidateStartEndTime($scope.booking.startTime, $scope.booking.endTime);
            if (timeValidation !== "") {
                SetModalErrorMessage(timeValidation);
                return;
            }

            //Change the "accept booking" button to stop multiple bookings
            $("#acceptBookingConfirmButton").prop('disabled', 'disabled');
            $("#acceptBookingConfirmButton").html('Editing Booking. Please wait..');

            try {
                //Create Date String
                $scope.newBooking.StartDate = FormatDateTimeForURL($scope.booking.date + ' ' + $scope.booking.startTime, 'MM-DD-YYYY-HHmm', true, true);
                $scope.newBooking.EndDate = FormatDateTimeForURL($scope.booking.date + ' ' + $scope.booking.endTime, 'MM-DD-YYYY-HHmm', true, true);

                if ($scope.booking.externalAttendees.length > 0) {
                    $scope.newBooking.externalAttendees = $scope.booking.externalAttendees;//.join(';');
                }

                //Validate if Date/Time/Attendees has changed
                var attendeesChanged = $scope.booking.numberOfAttendees != $scope.existingBooking.numberOfAttendees;
                var dateChanged = $scope.booking.date != $scope.existingBooking.date;
                var timespanChanged = moment($scope.booking.startTime, "hh:mm") < moment($scope.existingBooking.startTime, "hh:mm") || moment($scope.booking.endTime, "hh:mm") > moment($scope.existingBooking.endTime, "hh:mm");

                if (!attendeesChanged && !dateChanged && !timespanChanged) {
                    saveBooking($scope.bookingId, $scope.newBooking);
                }
                else {
                    $scope.availableRooms = AvailabilityService.get({
                        location: $scope.editBooking.location.name,
                        start: FormatDateTimeForURL($scope.booking.date + ' ' + $scope.booking.startTime, 'MM-DD-YYYY-HHmm', true, true),
                        smartRoom: $scope.newBooking.IsSmartMeeting,
                        end: FormatDateTimeForURL($scope.booking.date + ' ' + $scope.booking.endTime, 'MM-DD-YYYY-HHmm', true, true),
                        numberOfPeople: $scope.booking.numberOfAttendees,
                        existingBookingId: $scope.bookingId
                    }).$promise.then(function (success) {

                            $scope.availableRooms = success;

                            if ($scope.availableRooms.length === 0) {
                                EnableAcceptBookingButton();
                                SetModalErrorMessage('No Rooms Available using the below Date/Time/Attendees.');
                            }
                            else if ($scope.availableRooms.length === 1 && $scope.availableRooms[0].roomName == $scope.newBooking.Room.RoomName) {
                                saveBooking($scope.bookingId, $scope.newBooking);
                            }
                            else if ($scope.availableRooms[0].roomName === $scope.newBooking.Room.RoomName) {
                                saveBooking($scope.bookingId, $scope.newBooking);
                            }
                            else {
                                EnableAcceptBookingButton();
                                if ($scope.availableRooms.length > 1) {
                                    $("#alternateRoomsCont").css("display", "block");
                                }
                                else {
                                    $("#alternateRoomsCont").css("display", "none");
                                }

                                SetEditActiveTab('confirmEditBooking');
                                $scope.currentRoom = $scope.availableRooms[0];
                            }
                        },
                        function (error) {
                            EnableAcceptBookingButton();
                            alert('Unable to Edit. Please Try Again or Contact ITSD.');
                        });
                }

            } catch (e) {
                EnableAcceptBookingButton();
            }
        }

        $scope.EditBooking = function () {
            //Change the "accept booking" button to stop multiple bookings
            $("#confirmBookingConfirmButton").prop('disabled', 'disabled');
            $("#confirmBookingConfirmButton").html('Editing Booking. Please wait..');

            $scope.newBooking.RoomID = $scope.currentRoom.id;
            saveBooking($scope.bookingId, $scope.newBooking);

            //Disabled as the page refresh after save render the page with button enabled. By activating it here, there is a brief period where the user can select
            //the button twice, and give a false positive for a secondary failure of the same save
            //EnableConfirmBookingButton();
        }

        function saveBooking(id, booking) {
            BookingsService.update({
                existingId: id,
                recurrence: booking.recurrence || false
            }, booking).$promise.then(function (response) {

                alert('Booking Updated Successfully.');
                ReloadThisPage("bookings");

            }, function (error) {
                //Server Conflict
                if (error.status == 406) {
                    alert("Simultaneous booking conflict. Please try again.");
                    ReloadThisPage("bookings");
                }
                else {
                    alert('Unable to edit meeting room. Please contact ITSD.');
                }
                EnableEditBookingButton();
            });
        }

        $scope.modifyBookingOptions = resetModifyBookingOptions();

        function resetModifyBookingOptions() {
            return {
                deleteAllInRecurrence: false
            };
        }

        $scope.DeleteBooking = function () {
            //Change the "delete booking" button to stop multiple bookings
            $("#deleteBookingConfirmButton").prop('disabled', 'disabled');
            $("#deleteBookingConfirmButton").html('Deleting booking. Please wait..');

            try {
                BookingsService.remove(
                    {
                        bookingId: $scope.bookingId,
                        recurrence: $scope.modifyBookingOptions.deleteAllInRecurrence
                    }).$promise.then(function (success) {
                        $("#deleteModal").modal('hide');
                        $scope.GetBookings();
                        EnableDeleteBookingButton();
                    },
                    function (error) {
                        alert('Unable to delete booking. Please try again or contact ITSD.');
                        EnableDeleteBookingButton();
                    });

            } catch (e) {
                EnableDeleteBookingButton();
            }
        }

        $('#deleteModal').on('hidden.bs.modal', function () {
            $scope.modifyBookingOptions = resetModifyBookingOptions();
            $scope.$digest()
        })

        $scope.FormatPassRequired = function (required) {
            if (required) {
                return "Yes";
            }
            else {
                return "No";
            }
        }

        $scope.newBooking = {
            Room: { RoomName: '' },
            Subject: '',
            NumberOfAttendees: 0,
            RoomID: 0,
            ExternalNames: null,
            StartDate: new Date(),
            EndDate: new Date(),
            FlipChart: false,
            Projector: false,
            IsSmartMeeting: false
        };

        $scope.booking = {
            startTime: '',
            endTime: '',
            date: new Date(),
            numberOfAttendees: 0,
            externalAttendees: []
        }

        $scope.existingBooking = {
            startTime: '',
            endTime: '',
            date: new Date(),
            numberOfAttendees: 0
        }
    }
})();