import { useEffect, useRef, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  Box,
  ChakraProvider,
  Flex,
  Link,
  Spinner,
  extendTheme,
} from "@chakra-ui/react";

import { ColorScheme } from "../lib/colors";
import { Term } from "../lib/dates";
import { Firehose, FirehoseState } from "../lib/firehose";
import { RawClass } from "../lib/rawClass";

import { ActivityDescription } from "./ActivityDescription";
import { Calendar } from "./Calendar";
import { ClassTable } from "./ClassTable";
import { LeftFooter, RightFooter } from "./Footers";
import { Header } from "./Header";
import { ScheduleOption } from "./ScheduleOption";
import { ScheduleSwitcher } from "./ScheduleSwitcher";
import { SelectedActivities } from "./SelectedActivities";

import "@fontsource/inter/variable.css";
import "./App.scss";

/** The main application. */
export function App(props: { term: Term }) {
  const { term } = props;

  const firehoseRef = useRef<Firehose>();
  const firehose = firehoseRef.current;

  const [state, setState] = useState<FirehoseState>({
    selectedActivities: [],
    viewedActivity: undefined,
    selectedOption: 0,
    totalOptions: 0,
    units: 0,
    hours: 0,
    warnings: [],
    saveId: "",
    saves: [],
    colorScheme: ColorScheme.Light,
  });

  useEffect(() => {
    // TODO: rename this per semester
    fetch("full.json")
      .then(
        (res) =>
          res.json() as Promise<{
            classes: { [cls: string]: RawClass };
            lastUpdated: string;
          }>
      )
      .then((data) => {
        const classesMap = new Map(Object.entries(data.classes));
        const firehoseObj = new Firehose(classesMap, term, data.lastUpdated);
        firehoseObj.callback = setState;
        firehoseObj.updateState();
        firehoseRef.current = firehoseObj;
        // @ts-ignore
        window.firehose = firehoseObj;
      });
  }, [term]);

  const theme = extendTheme({
    components: {
      Link: {
        baseStyle: ({ colorMode }: { colorMode: string }) => ({
          color: colorMode === "light" ? "blue.500" : "blue.200",
        }),
      },
    },
    config: {
      initialColorMode: "light",
    },
    fonts: {
      body: `'InterVariable', sans-serif`,
      heading: `'InterVariable', sans-serif`,
    },
  });

  return (
    <ChakraProvider theme={theme}>
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID!}>
        <Box
          w="100%"
          p={4}
          fontSize="sm"
          textAlign="center"
          borderBottom="1px"
          borderBottomColor="gray.400"
        >
          This version is in beta. Saved info may disappear without warning.{" "}
          <Link href="https://forms.gle/6BQ8wMXCiHQBajGx7">
            Share your feedback!
          </Link>
        </Box>
        {!firehose ? (
          <Flex w="100%" h="100vh" align="center" justify="center">
            <Spinner />
          </Flex>
        ) : (
          <Flex
            w="100%"
            direction={{ base: "column", lg: "row" }}
            p={4}
            gap={8}
          >
            <Flex direction="column" w={{ base: "100%", lg: "50%" }} gap={6}>
              <Header />
              <ScheduleOption
                selectedOption={state.selectedOption}
                totalOptions={state.totalOptions}
                firehose={firehose}
              />
              <Calendar
                selectedActivities={state.selectedActivities}
                viewedActivity={state.viewedActivity}
                firehose={firehose}
              />
              <LeftFooter colorScheme={state.colorScheme} firehose={firehose} />
            </Flex>
            <Flex direction="column" w={{ base: "100%", lg: "50%" }} gap={6}>
              <ScheduleSwitcher
                firehose={firehose}
                saveId={state.saveId}
                saves={state.saves}
              />
              <SelectedActivities
                selectedActivities={state.selectedActivities}
                units={state.units}
                hours={state.hours}
                warnings={state.warnings}
                firehose={firehose}
              />
              <ClassTable
                classes={firehose.classes} // this is a constant; no need to add to state
                firehose={firehose}
              />
              {state.viewedActivity ? (
                <ActivityDescription
                  activity={state.viewedActivity}
                  firehose={firehose}
                />
              ) : null}
              <RightFooter firehose={firehose} />
            </Flex>
          </Flex>
        )}
      </GoogleOAuthProvider>
    </ChakraProvider>
  );
}
